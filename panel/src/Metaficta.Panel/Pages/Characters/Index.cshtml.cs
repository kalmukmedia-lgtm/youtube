using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Metaficta.Panel.Pages.Characters;

public record CharacterView(string Id, string Name, string Look, string? Reference, IReadOnlyList<string> Candidates);

public class IndexModel(StorageService storage, JobService jobs) : PageModel
{
    public List<CharacterView> Characters { get; private set; } = [];

    [BindProperty, Required, RegularExpression("^[a-z0-9][a-z0-9-]{0,59}$", ErrorMessage = "Kimlik küçük harf, rakam ve tire içermeli (ör. umay-ana).")]
    public string NewId { get; set; } = "";
    [BindProperty, Required(ErrorMessage = "Ad gerekli.")] public string NewName { get; set; } = "";
    [BindProperty, Required(ErrorMessage = "Görünüm tarifi gerekli."), StringLength(1000)] public string NewLook { get; set; } = "";
    [BindProperty, Range(1, 8)] public int Count { get; set; } = 4;

    public void OnGet() => Load();

    public async Task<IActionResult> OnPostCreateAsync()
    {
        if (!ModelState.IsValid)
        {
            Load();
            return Page();
        }
        var job = await jobs.CreateAsync(JobTypes.Character, null, new { id = NewId, name = NewName.Trim(), look = NewLook.Trim(), count = Count });
        TempData[job.DispatchError is null ? "Message" : "Error"] = job.DispatchError is null
            ? $"Aday portreler üretiliyor (iş #{job.Id}). Bitince bu sayfada seçebilirsin."
            : $"İş kuyruğa eklendi ama işçi tetiklenemedi: {job.DispatchError}";
        return RedirectToPage();
    }

    /// <summary>Seçilen adayı karakterin referans portresi yapar.</summary>
    public IActionResult OnPostPick(string id, string candidate)
    {
        if (!StorageService.IsValidId(id) || !candidate.EndsWith(".png") || candidate.Contains('/')) return BadRequest();
        storage.Copy($"characters/{id}/candidates/{candidate}", $"characters/{id}/reference.png");
        TempData["Message"] = "Referans portre güncellendi. Bundan sonraki görsellerde bu portre kullanılacak.";
        return Redirect($"/Characters#{id}");
    }

    private void Load()
    {
        foreach (var id in storage.ListDirectories("characters").Where(StorageService.IsValidId))
        {
            using var doc = storage.ReadJson($"characters/{id}/character.json");
            if (doc is null) continue;
            string S(string name) => doc.RootElement.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
            var reference = storage.Exists($"characters/{id}/reference.png") ? $"characters/{id}/reference.png" : null;
            var candidates = storage.List($"characters/{id}").Where(f => f.Path.Contains("/candidates/") && f.Path.EndsWith(".png")).Select(f => f.Path).ToList();
            Characters.Add(new CharacterView(id, S("name"), S("look"), reference, candidates));
        }
    }
}
