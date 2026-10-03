using System.Security.Cryptography;
using System.Text;
using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace Metaficta.Panel.Api;

/// <summary>
/// GitHub Actions işçisinin kullandığı API. Her istek "Authorization: Bearer &lt;işçi anahtarı&gt;" taşımalı.
/// </summary>
public static class WorkerApi
{
    /// <summary>Tek parça üst sınırı. İşçi 16 MB'lık parçalar gönderir (IIS'in varsayılan ~28 MB sınırının altında).</summary>
    public const long MaxChunkBytes = 64L * 1024 * 1024;

    public record ClaimRequest(int? JobId);
    public record LogRequest(string Text);
    public record CompleteRequest(bool Success, string? Error, string[]? ProjectIds);

    public static void MapWorkerApi(this WebApplication app)
    {
        var api = app.MapGroup("/api/worker").AddEndpointFilter(RequireWorkerToken).DisableAntiforgery();

        api.MapPost("/jobs/claim", async (ClaimRequest? request, JobService jobs) =>
        {
            var job = await jobs.ClaimAsync(request?.JobId);
            return job is null
                ? Results.NoContent()
                : Results.Ok(new { job.Id, job.Type, job.ProjectId, Params = System.Text.Json.JsonDocument.Parse(job.ParamsJson).RootElement });
        });

        api.MapPost("/jobs/{id:int}/log", async (int id, LogRequest request, JobService jobs) =>
        {
            await jobs.AppendLogAsync(id, request.Text);
            return Results.NoContent();
        });

        api.MapPost("/jobs/{id:int}/complete", async (int id, CompleteRequest request, JobService jobs) =>
        {
            await jobs.CompleteAsync(id, request.Success, request.Error, request.ProjectIds);
            return Results.NoContent();
        });

        api.MapGet("/files", (string prefix, StorageService storage) =>
            Results.Ok(storage.List(prefix).Select(f => new { f.Path, f.Size })));

        api.MapGet("/files/{**path}", (string path, StorageService storage) =>
        {
            var full = storage.Resolve(path);
            return File.Exists(full) ? Results.File(full, ContentType(full), enableRangeProcessing: true) : Results.NotFound();
        });

        api.MapPut("/files/{**path}", async (string path, HttpRequest request, StorageService storage, [FromQuery] long offset = 0, [FromQuery] bool final = true) =>
        {
            await storage.WriteChunkAsync(path, request.Body, offset, final, request.HttpContext.RequestAborted);
            return Results.NoContent();
        }).WithMetadata(new RequestSizeLimitAttribute(MaxChunkBytes));

        api.MapDelete("/files/{**path}", (string path, StorageService storage) =>
        {
            storage.Delete(path);
            return Results.NoContent();
        });
    }

    private static async ValueTask<object?> RequireWorkerToken(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var header = http.Request.Headers.Authorization.ToString();
        var settings = http.RequestServices.GetRequiredService<SettingsService>();
        var expected = await settings.GetSecretAsync(SettingKeys.WorkerToken);
        if (expected is null || !header.StartsWith("Bearer ", StringComparison.Ordinal) ||
            !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(header[7..].Trim()), Encoding.UTF8.GetBytes(expected)))
        {
            return Results.Unauthorized();
        }
        try
        {
            return await next(context);
        }
        catch (InvalidPathException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (ChunkOffsetException ex)
        {
            return Results.Conflict(new { error = ex.Message });
        }
        catch (KeyNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    public static string ContentType(string path) => ContentTypes.TryGetContentType(path, out var type) ? type : "application/octet-stream";
}
