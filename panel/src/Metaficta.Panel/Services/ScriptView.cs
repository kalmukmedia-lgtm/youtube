using System.Text.Json;

namespace Metaficta.Panel.Services;

public record SceneView(string Id, string Type, string Narration, IReadOnlyList<string> Details, string? ImageId);
public record FactCheckView(string Claim, string Confidence, string Note);

/// <summary>script.json'un panelde okunabilir gösterimi (packages/core/src/preview.ts'in karşılığı).</summary>
public class ScriptView
{
    public string Title { get; private init; } = "";
    public string Summary { get; private init; } = "";
    public string? LoopLine { get; private init; }
    public IReadOnlyList<string> TitleOptions { get; private init; } = [];
    public IReadOnlyList<SceneView> Scenes { get; private init; } = [];
    public IReadOnlyList<FactCheckView> FactChecks { get; private init; } = [];
    public IReadOnlyList<(string Title, string? Url)> Sources { get; private init; } = [];
    public IReadOnlyList<(string Id, string Name, string Look)> Characters { get; private init; } = [];
    public string Description { get; private init; } = "";
    public IReadOnlyList<string> Tags { get; private init; } = [];
    public IReadOnlyList<string> Hashtags { get; private init; } = [];
    public string ThumbnailText { get; private init; } = "";
    public int WordCount { get; private init; }

    public static ScriptView From(JsonElement root) => new()
    {
        Title = S(root, "workingTitle"),
        Summary = S(root, "summary"),
        LoopLine = root.TryGetProperty("loopLine", out var loop) && loop.ValueKind == JsonValueKind.String ? loop.GetString() : null,
        TitleOptions = Strings(root, "titleOptions"),
        Scenes = Array(root, "scenes").Select(Scene).ToList(),
        FactChecks = Array(root, "factChecks").Select(f => new FactCheckView(S(f, "claim"), S(f, "confidence"), S(f, "note"))).ToList(),
        Sources = Array(root, "sources").Select(s => (S(s, "title"), s.TryGetProperty("url", out var u) && u.ValueKind == JsonValueKind.String ? u.GetString() : null)).ToList(),
        Characters = Array(root, "characters").Select(c => (S(c, "id"), S(c, "name"), S(c, "look"))).ToList(),
        Description = S(root, "description"),
        Tags = Strings(root, "tags"),
        Hashtags = Strings(root, "hashtags"),
        ThumbnailText = root.TryGetProperty("thumbnail", out var th) ? S(th, "text") : "",
        WordCount = Array(root, "scenes").Sum(s => S(s, "narration").Split(' ', StringSplitOptions.RemoveEmptyEntries).Length),
    };

    public static string ConfidenceLabel(string confidence) => confidence switch
    {
        "high" => "✅ yüksek",
        "medium" => "⚠️ orta",
        "low" => "❌ düşük",
        _ => confidence,
    };

    private static SceneView Scene(JsonElement s)
    {
        var type = S(s, "type");
        var details = new List<string>();
        string? image = s.TryGetProperty("image", out var img) && img.ValueKind == JsonValueKind.Object ? S(img, "id") : null;
        switch (type)
        {
            case "ColdOpen": details.Add($"Ekran: {S(s, "headline")}"); break;
            case "CinematicImage":
                details.Add($"Kamera: {S(s, "motion")}");
                if (S(s, "overlayText") is { Length: > 0 } overlay) details.Add($"Yazı: {overlay}");
                break;
            case "ChapterTitle": details.Add($"Bölüm {N(s, "chapterNumber")}: {S(s, "title")}"); break;
            case "Quote": details.Add($"“{S(s, "quote")}” — {S(s, "attribution")}"); break;
            case "StatCounter": details.Add($"Sayaç: {S(s, "prefix")}{N(s, "value")}{S(s, "suffix")} — {S(s, "label")}"); break;
            case "CharacterCard": details.Add($"Kart: {S(s, "name")}, {S(s, "epithet")} ({S(s, "mythology")})"); break;
            case "Versus":
                var left = s.GetProperty("left");
                var right = s.GetProperty("right");
                details.Add($"{S(left, "name")} vs {S(right, "name")} · sonuç: {S(s, "verdict")}");
                image ??= left.TryGetProperty("image", out var li) ? S(li, "id") : null;
                break;
            case "Timeline": details.Add(string.Join(" → ", Array(s, "events").Select(e => $"{S(e, "date")} {S(e, "label")}"))); break;
            case "Countdown": details.Add($"#{N(s, "rank")} {S(s, "title")}"); break;
            case "Outro": details.Add($"CTA: {S(s, "cta")}"); break;
        }
        return new SceneView(S(s, "id"), type, S(s, "narration"), details, image);
    }

    private static string S(JsonElement e, string name) => e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
    private static string N(JsonElement e, string name) => e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetRawText() : "";
    private static IEnumerable<JsonElement> Array(JsonElement e, string name) => e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Array ? v.EnumerateArray() : [];
    private static List<string> Strings(JsonElement e, string name) => Array(e, name).Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString() ?? "").ToList();
}
