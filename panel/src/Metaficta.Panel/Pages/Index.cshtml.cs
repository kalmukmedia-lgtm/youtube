using System.ComponentModel.DataAnnotations;
using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Pages;

public class IndexModel(PanelDbContext db, JobService jobs, ProjectService projects) : PageModel
{
    public List<Project> Projects { get; private set; } = [];
    public List<Job> RecentJobs { get; private set; } = [];

    [BindProperty, Required(ErrorMessage = "Konu gerekli."), StringLength(300)]
    public string Topic { get; set; } = "";
    [BindProperty] public string Format { get; set; } = "long";
    [BindProperty] public string Series { get; set; } = "standalone";
    [BindProperty] public string? Theme { get; set; }
    [BindProperty] public bool Research { get; set; } = true;
    [BindProperty] public bool Revise { get; set; } = true;
    [BindProperty, Range(0, 10)] public int Shorts { get; set; }

    public async Task OnGetAsync()
    {
        await jobs.FailStaleAsync();
        await LoadAsync();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (Format is not ("long" or "short")) ModelState.AddModelError(nameof(Format), "Geçersiz format.");
        if (!Catalog.Series.Any(s => s.Id == Series)) ModelState.AddModelError(nameof(Series), "Geçersiz seri.");
        if (!string.IsNullOrEmpty(Theme) && !Catalog.Themes.Any(t => t.Id == Theme)) ModelState.AddModelError(nameof(Theme), "Geçersiz tema.");
        if (!ModelState.IsValid)
        {
            await LoadAsync();
            return Page();
        }
        var job = await jobs.CreateAsync(JobTypes.Script, null, new
        {
            topic = Topic.Trim(),
            format = Format,
            series = Series,
            theme = string.IsNullOrEmpty(Theme) ? null : Theme,
            research = Research,
            revise = Revise,
            shorts = Format == "long" && Shorts > 0 ? Shorts : (int?)null,
        });
        TempData[job.DispatchError is null ? "Message" : "Error"] = job.DispatchError is null
            ? "Senaryo işi başlatıldı. Birkaç dakika içinde proje burada görünecek."
            : $"İş kuyruğa eklendi ama işçi tetiklenemedi: {job.DispatchError}";
        return RedirectToPage("/Jobs/Details", new { id = job.Id });
    }

    public async Task<IActionResult> OnPostSyncAsync()
    {
        var count = await projects.SyncAllAsync();
        TempData["Message"] = $"{count} proje depodan yeniden tarandı.";
        return RedirectToPage();
    }

    private async Task LoadAsync()
    {
        Projects = await db.Projects.OrderByDescending(p => p.CreatedAt).Take(200).ToListAsync();
        RecentJobs = await db.Jobs.OrderByDescending(j => j.Id).Take(8).ToListAsync();
    }
}
