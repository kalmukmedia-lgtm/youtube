using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Pages.Projects;

public class DetailsModel(PanelDbContext db, StorageService storage, ProjectService projects, JobService jobs) : PageModel
{
    public Project Project { get; private set; } = null!;
    public ScriptView? Script { get; private set; }
    public List<Job> Jobs { get; private set; } = [];
    public IReadOnlyList<StoredFile> Previews { get; private set; } = [];
    public IReadOnlyList<StoredFile> Visuals { get; private set; } = [];
    public IReadOnlyList<StoredFile> Videos { get; private set; } = [];
    public IReadOnlyList<StoredFile> Thumbnails { get; private set; } = [];
    public Dictionary<string, string> AudioByScene { get; private set; } = [];
    public Dictionary<string, string> VisualById { get; private set; } = [];
    public bool HasActiveJob => Jobs.Any(j => j.Status is JobStatus.Queued or JobStatus.Running);

    public async Task<IActionResult> OnGetAsync(string id)
    {
        if (!await LoadAsync(id)) return NotFound();
        return Page();
    }

    public async Task<IActionResult> OnPostApproveAsync(string id)
    {
        if (!StorageService.IsValidId(id)) return NotFound();
        await projects.SetStageAsync(id, "approved");
        TempData["Message"] = "Senaryo onaylandı. Artık seslendirme ve üretim yapılabilir.";
        return RedirectToPage(new { id });
    }

    /// <summary>İşçi işleri: voice, images, stills, render, produce, shorts.</summary>
    public async Task<IActionResult> OnPostJobAsync(string id, string type, bool draft, bool force, string? only, int count = 3)
    {
        if (!StorageService.IsValidId(id) || await db.Projects.FindAsync(id) is not { } project) return NotFound();
        object parameters = type switch
        {
            JobTypes.Render => new { draft },
            JobTypes.Voice => new { force },
            JobTypes.Images => new { force, only = string.IsNullOrWhiteSpace(only) ? null : only.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) },
            JobTypes.Shorts => new { count = Math.Clamp(count, 1, 10) },
            _ => new { },
        };
        if (type is JobTypes.Voice or JobTypes.Produce && project.Stage == "script")
        {
            TempData["Error"] = "Önce senaryoyu onayla (seslendirme ücretsiz kotayı kullanır).";
            return RedirectToPage(new { id });
        }
        if (type is not (JobTypes.Voice or JobTypes.Images or JobTypes.Stills or JobTypes.Render or JobTypes.Produce or JobTypes.Shorts)) return BadRequest();
        var job = await jobs.CreateAsync(type, id, parameters);
        TempData[job.DispatchError is null ? "Message" : "Error"] = job.DispatchError is null
            ? $"{JobTypes.Label(type)} işi başlatıldı (#{job.Id})."
            : $"İş kuyruğa eklendi ama işçi tetiklenemedi: {job.DispatchError}";
        return RedirectToPage(new { id });
    }

    private async Task<bool> LoadAsync(string id)
    {
        if (!StorageService.IsValidId(id)) return false;
        var project = await db.Projects.FindAsync(id) ?? await projects.SyncAsync(id);
        if (project is null) return false;
        Project = project;
        using (var doc = storage.ReadJson(StorageService.ProjectPath(id, "script.json")))
        {
            if (doc is not null) Script = ScriptView.From(doc.RootElement);
        }
        Jobs = await db.Jobs.Where(j => j.ProjectId == id).OrderByDescending(j => j.Id).Take(20).ToListAsync();
        var files = storage.List(StorageService.ProjectPath(id));
        string Rel(StoredFile f) => f.Path[(StorageService.ProjectPath(id).Length + 1)..];
        Previews = files.Where(f => Rel(f).StartsWith("preview/") && f.Path.EndsWith(".png")).ToList();
        Visuals = files.Where(f => Rel(f).StartsWith("visuals/")).ToList();
        Videos = files.Where(f => Rel(f).StartsWith("render/") && f.Path.EndsWith(".mp4")).ToList();
        Thumbnails = files.Where(f => Rel(f).StartsWith("thumbnail/") && f.Path.EndsWith(".png")).ToList();
        AudioByScene = files.Where(f => Rel(f).StartsWith("audio/") && f.Path.EndsWith(".mp3")).ToDictionary(f => Path.GetFileNameWithoutExtension(f.Path), f => f.Path);
        VisualById = Visuals.GroupBy(f => Path.GetFileNameWithoutExtension(f.Path)).ToDictionary(g => g.Key, g => g.First().Path);
        return true;
    }
}
