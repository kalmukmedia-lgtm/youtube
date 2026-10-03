using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Metaficta.Panel.Pages.Jobs;

public class DetailsModel(PanelDbContext db, JobService jobs) : PageModel
{
    public Job Job { get; private set; } = null!;

    public async Task<IActionResult> OnGetAsync(int id)
    {
        if (await db.Jobs.FindAsync(id) is not { } job) return NotFound();
        Job = job;
        return Page();
    }

    /// <summary>İşçi tetiklenemediyse (ör. GitHub ayarları sonradan girildiyse) kuyruktaki işi tekrar tetikler.</summary>
    public async Task<IActionResult> OnPostDispatchAsync(int id)
    {
        if (await db.Jobs.FindAsync(id) is not { } job) return NotFound();
        if (job.Status != JobStatus.Queued) return RedirectToPage(new { id });
        await jobs.DispatchAsync(job);
        TempData[job.DispatchError is null ? "Message" : "Error"] = job.DispatchError is null ? "İşçi tetiklendi." : job.DispatchError;
        return RedirectToPage(new { id });
    }

    public async Task<IActionResult> OnPostRetryAsync(int id)
    {
        var job = await jobs.RetryAsync(id);
        TempData["Message"] = $"İş yeniden kuyruğa eklendi (#{job.Id}).";
        return RedirectToPage(new { id = job.Id });
    }
}
