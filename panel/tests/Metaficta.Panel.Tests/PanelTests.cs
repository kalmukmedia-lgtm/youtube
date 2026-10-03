using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Metaficta.Panel.Tests;

public partial class PanelTests : IDisposable
{
    private readonly PanelFactory factory = new();

    public void Dispose() => factory.Dispose();

    private HttpClient Browser() => factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    private async Task<HttpClient> WorkerAsync()
    {
        var token = await factory.WithAsync(sp => sp.GetRequiredService<SettingsService>().GetOrCreateWorkerTokenAsync());
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [GeneratedRegex("name=\"__RequestVerificationToken\" type=\"hidden\" value=\"([^\"]+)\"")]
    private static partial Regex AntiforgeryPattern();

    private static async Task<string> AntiforgeryAsync(HttpClient client, string url)
    {
        var html = await client.GetStringAsync(url);
        return AntiforgeryPattern().Match(html).Groups[1].Value;
    }

    /// <summary>Kurulum sayfasından yönetici oluşturup giriş yapmış bir tarayıcı döndürür.</summary>
    private async Task<HttpClient> LoggedInAsync()
    {
        var client = Browser();
        var token = await AntiforgeryAsync(client, "/Setup");
        var response = await client.PostAsync("/Setup", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["Username"] = "admin",
            ["Password"] = "cok-gizli-sifre",
            ["PasswordAgain"] = "cok-gizli-sifre",
            ["__RequestVerificationToken"] = token,
        }));
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        return client;
    }

    [Fact]
    public async Task Redirects_to_setup_until_an_admin_exists()
    {
        var response = await Browser().GetAsync("/");
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/Setup", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Setup_creates_admin_and_closes_itself()
    {
        var client = await LoggedInAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/")).StatusCode);

        var setupAgain = await Browser().GetAsync("/Setup");
        Assert.Equal(HttpStatusCode.Redirect, setupAgain.StatusCode);
        Assert.StartsWith("/Login", setupAgain.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task Pages_and_media_require_login()
    {
        await LoggedInAsync();
        var anonymous = Browser();
        Assert.Equal(HttpStatusCode.Redirect, (await anonymous.GetAsync("/Jobs")).StatusCode);
        Assert.NotEqual(HttpStatusCode.OK, (await anonymous.GetAsync("/media/projects/x/script.json")).StatusCode);
    }

    [Fact]
    public async Task New_video_form_queues_a_script_job_and_dispatches_it()
    {
        var client = await LoggedInAsync();
        var token = await AntiforgeryAsync(client, "/");
        var response = await client.PostAsync("/", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["Topic"] = "Zeus vs Odin",
            ["Format"] = "long",
            ["Series"] = "gods-battle",
            ["Theme"] = "",
            ["Research"] = "true",
            ["Revise"] = "false",
            ["Shorts"] = "2",
            ["__RequestVerificationToken"] = token,
        }));
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);

        var job = await factory.WithAsync(sp => sp.GetRequiredService<PanelDbContext>().Jobs.SingleAsync());
        Assert.Equal(JobTypes.Script, job.Type);
        Assert.Equal(JobStatus.Queued, job.Status);
        using var p = JsonDocument.Parse(job.ParamsJson);
        Assert.Equal("Zeus vs Odin", p.RootElement.GetProperty("topic").GetString());
        Assert.Equal(2, p.RootElement.GetProperty("shorts").GetInt32());
        Assert.False(p.RootElement.GetProperty("revise").GetBoolean());
        Assert.Equal([job.Id], factory.Dispatcher.Dispatched);
    }

    [Fact]
    public async Task Worker_api_rejects_missing_or_wrong_token()
    {
        await factory.WithAsync(sp => sp.GetRequiredService<SettingsService>().GetOrCreateWorkerTokenAsync());
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/worker/jobs/claim", new { })).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "yanlis");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/worker/jobs/claim", new { })).StatusCode);
    }

    [Fact]
    public async Task Jobs_are_claimed_once_logged_and_completed()
    {
        var worker = await WorkerAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await worker.PostAsJsonAsync("/api/worker/jobs/claim", new { })).StatusCode);

        var job = await factory.WithAsync(sp => sp.GetRequiredService<JobService>().CreateAsync(JobTypes.Images, null, new { force = true }));
        var claim = await worker.PostAsJsonAsync("/api/worker/jobs/claim", new { jobId = job.Id });
        Assert.Equal(HttpStatusCode.OK, claim.StatusCode);
        using (var body = JsonDocument.Parse(await claim.Content.ReadAsStringAsync()))
        {
            Assert.Equal("images", body.RootElement.GetProperty("type").GetString());
            Assert.True(body.RootElement.GetProperty("params").GetProperty("force").GetBoolean());
        }
        // Aynı iş ikinci kez alınamaz
        Assert.Equal(HttpStatusCode.NoContent, (await worker.PostAsJsonAsync("/api/worker/jobs/claim", new { jobId = job.Id })).StatusCode);

        await worker.PostAsJsonAsync($"/api/worker/jobs/{job.Id}/log", new { text = "🎨 başladı\n" });
        await worker.PostAsJsonAsync($"/api/worker/jobs/{job.Id}/complete", new { success = false, error = "boom" });

        var saved = await factory.WithAsync(sp => sp.GetRequiredService<PanelDbContext>().Jobs.AsNoTracking().SingleAsync(j => j.Id == job.Id));
        Assert.Equal(JobStatus.Failed, saved.Status);
        Assert.Equal("boom", saved.Error);
        Assert.Contains("başladı", saved.Log);
        Assert.NotNull(saved.FinishedAt);
    }

    [Fact]
    public async Task Files_upload_in_chunks_and_download_back()
    {
        var worker = await WorkerAsync();
        var data = Encoding.UTF8.GetBytes(new string('x', 1000) + new string('y', 500));
        var path = "/api/worker/files/projects/demo/render/long.mp4";

        Assert.Equal(HttpStatusCode.NoContent, (await worker.PutAsync($"{path}?offset=0&final=false", new ByteArrayContent(data[..1000]))).StatusCode);
        // Henüz tamamlanmamış dosya listede görünmez
        Assert.Equal("[]", await worker.GetStringAsync("/api/worker/files?prefix=projects/demo"));
        // Yanlış konum reddedilir
        Assert.Equal(HttpStatusCode.Conflict, (await worker.PutAsync($"{path}?offset=10&final=true", new ByteArrayContent(data[1000..]))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await worker.PutAsync($"{path}?offset=1000&final=true", new ByteArrayContent(data[1000..]))).StatusCode);

        Assert.Equal(data, await worker.GetByteArrayAsync(path));
        Assert.Contains("\"size\":1500", await worker.GetStringAsync("/api/worker/files?prefix=projects/demo"));

        Assert.Equal(HttpStatusCode.NoContent, (await worker.DeleteAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await worker.GetAsync(path)).StatusCode);
    }

    [Theory]
    [InlineData("/api/worker/files/projects/../../etc/passwd")]
    [InlineData("/api/worker/files/secrets/x.txt")]
    [InlineData("/api/worker/files/projects/a/%2e%2e/%2e%2e/keys/k.xml")]
    public async Task Files_outside_storage_are_rejected(string url)
    {
        var worker = await WorkerAsync();
        var response = await worker.PutAsync(url, new ByteArrayContent([1, 2, 3]));
        Assert.True(response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound, $"{url} → {response.StatusCode}");
    }

    [Fact]
    public async Task Completing_a_script_job_registers_the_created_project()
    {
        var worker = await WorkerAsync();
        var job = await factory.WithAsync(sp => sp.GetRequiredService<JobService>().CreateAsync(JobTypes.Script, null, new { topic = "Zeus" }));
        await worker.PostAsJsonAsync("/api/worker/jobs/claim", new { jobId = job.Id });

        var script = """{"id":"2026-10-03-zeus","workingTitle":"Zeus vs Odin","topic":"Zeus","format":"long","series":"gods-battle","theme":"olympus-gold","createdAt":"2026-10-03T10:00:00.000Z","scenes":[]}""";
        await worker.PutAsync("/api/worker/files/projects/2026-10-03-zeus/script.json", new StringContent(script));
        await worker.PutAsync("/api/worker/files/projects/2026-10-03-zeus/status.json", new StringContent("""{"stage":"script","updatedAt":"x","history":[]}"""));
        await worker.PostAsJsonAsync($"/api/worker/jobs/{job.Id}/complete", new { success = true, projectIds = new[] { "2026-10-03-zeus" } });

        var project = await factory.WithAsync(sp => sp.GetRequiredService<PanelDbContext>().Projects.SingleAsync());
        Assert.Equal("Zeus vs Odin", project.Title);
        Assert.Equal("gods-battle", project.Series);
        Assert.Equal("script", project.Stage);

        var browser = await LoggedInAsync();
        var page = await browser.GetStringAsync("/Projects/2026-10-03-zeus");
        Assert.Contains("Zeus vs Odin", page);
    }

    [Fact]
    public async Task Approving_writes_status_json_in_the_cli_format()
    {
        var storage = factory.Services.GetRequiredService<StorageService>();
        await storage.WriteTextAsync("projects/demo/script.json", """{"id":"demo","workingTitle":"Demo","format":"short","scenes":[]}""");
        await storage.WriteTextAsync("projects/demo/status.json", """{"stage":"script","updatedAt":"a","history":[{"stage":"script","at":"a"}]}""");

        await factory.WithAsync(async sp => { await sp.GetRequiredService<ProjectService>().SetStageAsync("demo", "approved"); return true; });

        using var status = storage.ReadJson("projects/demo/status.json")!;
        Assert.Equal("approved", status.RootElement.GetProperty("stage").GetString());
        Assert.Equal(2, status.RootElement.GetProperty("history").GetArrayLength());
        var project = await factory.WithAsync(sp => sp.GetRequiredService<PanelDbContext>().Projects.SingleAsync());
        Assert.Equal("approved", project.Stage);
    }

    [Fact]
    public async Task Script_editing_rejects_invalid_json_and_id_changes()
    {
        var storage = factory.Services.GetRequiredService<StorageService>();
        await storage.WriteTextAsync("projects/demo/script.json", """{"id":"demo","workingTitle":"Demo","scenes":[]}""");
        var service = (Func<string, Task<string?>>)(json => factory.WithAsync(sp => sp.GetRequiredService<ProjectService>().SaveScriptAsync("demo", json)));

        Assert.NotNull(await service("{ bozuk"));
        Assert.NotNull(await service("""{"id":"baska","scenes":[]}"""));
        Assert.NotNull(await service("""{"id":"demo"}"""));
        Assert.Null(await service("""{"id":"demo","workingTitle":"Yeni başlık","scenes":[]}"""));
        Assert.Contains("Yeni başlık", storage.ReadText("projects/demo/script.json"));
    }

    [Fact]
    public async Task Failed_dispatch_keeps_job_queued_with_error()
    {
        factory.Dispatcher.NextError = "GitHub ayarları eksik";
        var job = await factory.WithAsync(sp => sp.GetRequiredService<JobService>().CreateAsync(JobTypes.Stills, "demo"));
        Assert.Equal(JobStatus.Queued, job.Status);
        Assert.Equal("GitHub ayarları eksik", job.DispatchError);
    }
}

public partial class PanelTests
{
    [Fact]
    public async Task Logout_form_carries_antiforgery_token_and_signs_out()
    {
        var client = await LoggedInAsync();
        var html = await client.GetStringAsync("/Jobs");
        var form = Regex.Match(html, "<form method=\"post\" class=\"inline\" action=\"/Logout\">(.*?)</form>", RegexOptions.Singleline);
        Assert.True(form.Success, "Çıkış formu bulunamadı");
        var token = AntiforgeryPattern().Match(form.Value).Groups[1].Value;
        Assert.NotEmpty(token);

        var response = await client.PostAsync("/Logout", new FormUrlEncodedContent(new Dictionary<string, string> { ["__RequestVerificationToken"] = token }));
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal(HttpStatusCode.Redirect, (await client.GetAsync("/Jobs")).StatusCode);
    }
}
