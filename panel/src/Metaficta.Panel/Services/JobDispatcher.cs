using System.Net.Http.Headers;
using System.Net.Http.Json;
using Metaficta.Panel.Data;

namespace Metaficta.Panel.Services;

/// <summary>Kuyruğa eklenen işi çalıştıracak işçiyi tetikler.</summary>
public interface IJobDispatcher
{
    /// <returns>Hata mesajı; başarılıysa null.</returns>
    Task<string?> DispatchAsync(Job job, CancellationToken ct = default);

    /// <returns>Bağlantı sorunu varsa hata mesajı.</returns>
    Task<string?> TestAsync(CancellationToken ct = default);
}

/// <summary>GitHub Actions'taki worker.yml iş akışını workflow_dispatch ile başlatır.</summary>
public class GitHubJobDispatcher(HttpClient http, SettingsService settings) : IJobDispatcher
{
    public async Task<string?> DispatchAsync(Job job, CancellationToken ct = default)
    {
        var gh = await settings.GetGitHubAsync();
        if (!gh.IsComplete) return "GitHub ayarları eksik (Ayarlar sayfası).";
        var branch = gh.Ref;
        if (string.IsNullOrWhiteSpace(branch))
        {
            (branch, var error) = await DefaultBranchAsync(gh, ct);
            if (error is not null) return error;
        }
        using var request = Request(HttpMethod.Post, $"repos/{gh.Owner}/{gh.Repo}/actions/workflows/{gh.Workflow}/dispatches", gh.Token!);
        request.Content = JsonContent.Create(new { @ref = branch, inputs = new { job_id = job.Id.ToString() } });
        return await SendAsync(request, ct);
    }

    public async Task<string?> TestAsync(CancellationToken ct = default)
    {
        var gh = await settings.GetGitHubAsync();
        if (!gh.IsComplete) return "GitHub ayarları eksik.";
        using var request = Request(HttpMethod.Get, $"repos/{gh.Owner}/{gh.Repo}/actions/workflows/{gh.Workflow}", gh.Token!);
        return await SendAsync(request, ct);
    }

    /// <summary>Dal ayarı boşsa iş akışı deponun varsayılan dalında çalıştırılır.</summary>
    private async Task<(string? Branch, string? Error)> DefaultBranchAsync(GitHubSettings gh, CancellationToken ct)
    {
        using var request = Request(HttpMethod.Get, $"repos/{gh.Owner}/{gh.Repo}", gh.Token!);
        try
        {
            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode) return (null, $"GitHub deposu okunamadı ({(int)response.StatusCode}).");
            var repo = await response.Content.ReadFromJsonAsync<RepoInfo>(ct);
            return (repo?.default_branch, repo?.default_branch is null ? "Deponun varsayılan dalı bulunamadı." : null);
        }
        catch (HttpRequestException ex)
        {
            return (null, $"GitHub'a bağlanılamadı: {ex.Message}");
        }
    }

    private sealed record RepoInfo(string? default_branch);

    private static HttpRequestMessage Request(HttpMethod method, string path, string token)
    {
        var request = new HttpRequestMessage(method, new Uri(new Uri("https://api.github.com/"), path));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        request.Headers.UserAgent.Add(new ProductInfoHeaderValue("Metaficta-Panel", "1.0"));
        request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");
        return request;
    }

    private async Task<string?> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        try
        {
            using var response = await http.SendAsync(request, ct);
            if (response.IsSuccessStatusCode) return null;
            var body = await response.Content.ReadAsStringAsync(ct);
            return $"GitHub {(int)response.StatusCode}: {(body.Length > 300 ? body[..300] : body)}";
        }
        catch (HttpRequestException ex)
        {
            return $"GitHub'a bağlanılamadı: {ex.Message}";
        }
    }
}
