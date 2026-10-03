using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Metaficta.Panel.Pages.Projects;

public class EditModel(StorageService storage, ProjectService projects) : PageModel
{
    public string Id { get; private set; } = "";
    [BindProperty] public string Json { get; set; } = "";
    public string? Error { get; private set; }

    public IActionResult OnGet(string id)
    {
        if (!StorageService.IsValidId(id)) return NotFound();
        var text = storage.ReadText(StorageService.ProjectPath(id, "script.json"));
        if (text is null) return NotFound();
        Id = id;
        Json = text;
        return Page();
    }

    public async Task<IActionResult> OnPostAsync(string id)
    {
        if (!StorageService.IsValidId(id)) return NotFound();
        Id = id;
        Error = await projects.SaveScriptAsync(id, Json);
        if (Error is not null) return Page();
        TempData["Message"] = "Senaryo kaydedildi. Değişen sahneler bir sonraki seslendirmede yeniden seslendirilir.";
        return Redirect($"/Projects/{id}");
    }
}
