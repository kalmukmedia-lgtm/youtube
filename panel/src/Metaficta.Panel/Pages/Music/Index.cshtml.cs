using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Metaficta.Panel.Pages.Music;

[RequestSizeLimit(60L * 1024 * 1024)]
[RequestFormLimits(MultipartBodyLengthLimit = 60L * 1024 * 1024)]
public class IndexModel(StorageService storage) : PageModel
{
    private static readonly string[] Extensions = [".mp3", ".m4a", ".wav", ".ogg"];
    public Dictionary<string, IReadOnlyList<StoredFile>> Library { get; } = [];

    public void OnGet()
    {
        foreach (var (mood, _) in Catalog.MusicMoods) Library[mood] = storage.List($"music/{mood}");
    }

    public async Task<IActionResult> OnPostUploadAsync(string mood, List<IFormFile> files)
    {
        if (!Catalog.MusicMoods.Any(m => m.Id == mood)) return BadRequest();
        var saved = 0;
        foreach (var file in files)
        {
            var name = Path.GetFileName(file.FileName);
            if (!Extensions.Contains(Path.GetExtension(name).ToLowerInvariant())) continue;
            var safe = string.Concat(name.Select(ch => char.IsLetterOrDigit(ch) || ch is '.' or '-' or '_' ? ch : '-'));
            await storage.SaveUploadAsync($"music/{mood}/{safe}", file);
            saved++;
        }
        TempData[saved > 0 ? "Message" : "Error"] = saved > 0 ? $"{saved} parça yüklendi." : "Desteklenen ses dosyası bulunamadı (.mp3, .m4a, .wav, .ogg).";
        return RedirectToPage();
    }

    public IActionResult OnPostDelete(string path)
    {
        if (!path.StartsWith("music/")) return BadRequest();
        storage.Delete(path);
        TempData["Message"] = "Parça silindi.";
        return RedirectToPage();
    }
}
