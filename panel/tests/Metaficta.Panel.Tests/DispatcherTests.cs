using System.Net;
using System.Text.Json;
using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Metaficta.Panel.Tests;

public class DispatcherTests : IDisposable
{
    private readonly PanelFactory factory = new();
    public void Dispose() => factory.Dispose();

    private sealed class RecordingHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<(HttpRequestMessage Request, string? Body)> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Requests.Add((request, request.Content is null ? null : await request.Content.ReadAsStringAsync(ct)));
            return respond(request);
        }
    }

    private async Task<(string? Error, RecordingHandler Handler)> DispatchAsync(string? branch, Func<HttpRequestMessage, HttpResponseMessage> respond)
    {
        using var scope = factory.Services.CreateScope();
        var settings = scope.ServiceProvider.GetRequiredService<SettingsService>();
        await settings.SetAsync(SettingKeys.GitHubOwner, "kalmukmedia-lgtm");
        await settings.SetAsync(SettingKeys.GitHubRepo, "youtube");
        await settings.SetAsync(SettingKeys.GitHubRef, branch);
        await settings.SetSecretAsync(SettingKeys.GitHubToken, "ghp_test");
        var handler = new RecordingHandler(respond);
        var dispatcher = new GitHubJobDispatcher(new HttpClient(handler), settings);
        return (await dispatcher.DispatchAsync(new Job { Id = 42, Type = JobTypes.Render }), handler);
    }

    [Fact]
    public async Task Dispatches_workflow_on_the_default_branch_when_no_branch_is_set()
    {
        var (error, handler) = await DispatchAsync(null, request => request.Method == HttpMethod.Get
            ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"default_branch":"claude/hopeful-archimedes-ig6l3x"}""") }
            : new HttpResponseMessage(HttpStatusCode.NoContent));

        Assert.Null(error);
        Assert.Equal(2, handler.Requests.Count);
        var (dispatch, body) = handler.Requests[1];
        Assert.Equal("https://api.github.com/repos/kalmukmedia-lgtm/youtube/actions/workflows/worker.yml/dispatches", dispatch.RequestUri!.ToString());
        Assert.Equal("Bearer ghp_test", dispatch.Headers.Authorization!.ToString());
        using var json = JsonDocument.Parse(body!);
        Assert.Equal("claude/hopeful-archimedes-ig6l3x", json.RootElement.GetProperty("ref").GetString());
        Assert.Equal("42", json.RootElement.GetProperty("inputs").GetProperty("job_id").GetString());
    }

    [Fact]
    public async Task Uses_configured_branch_and_reports_github_errors()
    {
        var (error, handler) = await DispatchAsync("main", _ => new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("""{"message":"Not Found"}""") });
        Assert.Single(handler.Requests);
        Assert.Contains("\"ref\":\"main\"", handler.Requests[0].Body);
        Assert.StartsWith("GitHub 404", error);
    }

    [Fact]
    public async Task Missing_settings_are_reported_without_calling_github()
    {
        using var scope = factory.Services.CreateScope();
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.NoContent));
        var dispatcher = new GitHubJobDispatcher(new HttpClient(handler), scope.ServiceProvider.GetRequiredService<SettingsService>());
        Assert.NotNull(await dispatcher.DispatchAsync(new Job { Id = 1, Type = JobTypes.Stills }));
        Assert.Empty(handler.Requests);
    }
}
