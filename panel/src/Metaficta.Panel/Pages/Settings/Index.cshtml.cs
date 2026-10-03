using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Metaficta.Panel.Pages.Settings;

public class IndexModel(SettingsService settings, IJobDispatcher dispatcher) : PageModel
{
    [BindProperty] public string? Owner { get; set; }
    [BindProperty] public string? Repo { get; set; }
    [BindProperty] public string Workflow { get; set; } = "worker.yml";
    /// <summary>Boşsa deponun varsayılan dalı kullanılır.</summary>
    [BindProperty] public string? Ref { get; set; }
    /// <summary>Boş bırakılırsa mevcut token korunur.</summary>
    [BindProperty] public string? Token { get; set; }

    public bool HasToken { get; private set; }
    public string WorkerToken { get; private set; } = "";
    public string PanelUrl => $"{Request.Scheme}://{Request.Host}";

    public async Task OnGetAsync() => await LoadAsync();

    public async Task<IActionResult> OnPostSaveAsync()
    {
        await settings.SetAsync(SettingKeys.GitHubOwner, Owner?.Trim());
        await settings.SetAsync(SettingKeys.GitHubRepo, Repo?.Trim());
        await settings.SetAsync(SettingKeys.GitHubWorkflow, string.IsNullOrWhiteSpace(Workflow) ? "worker.yml" : Workflow.Trim());
        await settings.SetAsync(SettingKeys.GitHubRef, Ref?.Trim());
        if (!string.IsNullOrWhiteSpace(Token)) await settings.SetSecretAsync(SettingKeys.GitHubToken, Token.Trim());
        TempData["Message"] = "Ayarlar kaydedildi.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostTestAsync()
    {
        var error = await dispatcher.TestAsync();
        TempData[error is null ? "Message" : "Error"] = error is null ? "GitHub bağlantısı çalışıyor; iş akışı bulundu." : error;
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRegenerateAsync()
    {
        await settings.RegenerateWorkerTokenAsync();
        TempData["Message"] = "Yeni işçi anahtarı oluşturuldu. GitHub'daki WORKER_TOKEN secret'ını güncellemeyi unutma.";
        return RedirectToPage();
    }

    private async Task LoadAsync()
    {
        var gh = await settings.GetGitHubAsync();
        Owner = gh.Owner;
        Repo = gh.Repo;
        Workflow = gh.Workflow;
        Ref = gh.Ref;
        HasToken = gh.Token is not null;
        WorkerToken = await settings.GetOrCreateWorkerTokenAsync();
    }
}
