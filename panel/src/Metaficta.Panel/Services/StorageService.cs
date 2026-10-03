using System.Text.Json;
using System.Text.RegularExpressions;

namespace Metaficta.Panel.Services;

public record StoredFile(string Path, long Size, DateTime ModifiedUtc);

/// <summary>
/// Proje dosyalarının (script.json, ses, görsel, video) ve karakter/müzik kütüphanesinin diskteki deposu.
/// Klasör düzeni CLI'daki ile aynıdır: projects/&lt;id&gt;/…, characters/&lt;id&gt;/…, music/&lt;ruh-hali&gt;/…
/// Varsayılan konum App_Data/storage: IIS bu klasörü dışarıya sunmaz.
/// </summary>
public partial class StorageService
{
    private static readonly string[] AllowedRoots = ["projects", "characters", "music"];
    private const string PartSuffix = ".part";

    public string Root { get; }

    public StorageService(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Storage:Path"];
        Root = Path.GetFullPath(string.IsNullOrWhiteSpace(configured) ? Path.Combine(env.ContentRootPath, "App_Data", "storage") : configured);
        foreach (var dir in AllowedRoots) Directory.CreateDirectory(Path.Combine(Root, dir));
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{0,119}$")]
    private static partial Regex IdPattern();

    public static bool IsValidId(string? id) => id is not null && IdPattern().IsMatch(id);

    /// <summary>Göreli yolu güvenli şekilde mutlak yola çevirir; depo dışına çıkan veya izinsiz kökler reddedilir.</summary>
    public string Resolve(string relative)
    {
        var normalized = (relative ?? "").Replace('\\', '/').Trim('/');
        var segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || !AllowedRoots.Contains(segments[0]) || segments.Any(s => s is "." or ".." || s.Contains(':')))
            throw new InvalidPathException(relative ?? "");
        var full = Path.GetFullPath(Path.Combine([Root, .. segments]));
        if (!full.StartsWith(Root + Path.DirectorySeparatorChar, StringComparison.Ordinal)) throw new InvalidPathException(relative ?? "");
        return full;
    }

    public string ToRelative(string fullPath) => Path.GetRelativePath(Root, fullPath).Replace('\\', '/');

    public bool Exists(string relative) => File.Exists(Resolve(relative));

    /// <summary>Önekin altındaki tüm dosyalar (yarım kalmış yüklemeler hariç).</summary>
    public IReadOnlyList<StoredFile> List(string prefix)
    {
        var dir = Resolve(prefix);
        if (!Directory.Exists(dir)) return [];
        return Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories)
            .Where(f => !f.EndsWith(PartSuffix, StringComparison.Ordinal))
            .Select(f => new FileInfo(f))
            .Select(f => new StoredFile(ToRelative(f.FullName), f.Length, f.LastWriteTimeUtc))
            .OrderBy(f => f.Path, StringComparer.Ordinal)
            .ToList();
    }

    public IReadOnlyList<string> ListDirectories(string prefix)
    {
        var dir = Resolve(prefix);
        return Directory.Exists(dir) ? Directory.GetDirectories(dir).Select(Path.GetFileName).OfType<string>().Order().ToList() : [];
    }

    /// <summary>
    /// Parça parça yükleme: her parça &lt;dosya&gt;.part dosyasına <paramref name="offset"/> konumundan yazılır,
    /// son parçada dosya asıl adına taşınır. Paylaşımlı hosting'in istek boyutu sınırına takılmamak için kullanılır.
    /// </summary>
    public async Task WriteChunkAsync(string relative, Stream body, long offset, bool final, CancellationToken ct = default)
    {
        var target = Resolve(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        var part = target + PartSuffix;
        if (offset == 0 && File.Exists(part)) File.Delete(part);
        await using (var stream = new FileStream(part, FileMode.OpenOrCreate, FileAccess.Write, FileShare.None))
        {
            if (stream.Length != offset) throw new ChunkOffsetException(stream.Length, offset);
            stream.Seek(offset, SeekOrigin.Begin);
            await body.CopyToAsync(stream, ct);
        }
        if (final) File.Move(part, target, overwrite: true);
    }

    public async Task WriteTextAsync(string relative, string content, CancellationToken ct = default)
    {
        var target = Resolve(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        await File.WriteAllTextAsync(target, content, ct);
    }

    public async Task SaveUploadAsync(string relative, IFormFile file, CancellationToken ct = default)
    {
        var target = Resolve(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        await using var stream = new FileStream(target, FileMode.Create, FileAccess.Write);
        await file.CopyToAsync(stream, ct);
    }

    public void Copy(string fromRelative, string toRelative)
    {
        var target = Resolve(toRelative);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        File.Copy(Resolve(fromRelative), target, overwrite: true);
    }

    public void Delete(string relative)
    {
        var full = Resolve(relative);
        if (File.Exists(full)) File.Delete(full);
    }

    public string? ReadText(string relative)
    {
        var full = Resolve(relative);
        return File.Exists(full) ? File.ReadAllText(full) : null;
    }

    public JsonDocument? ReadJson(string relative)
    {
        var text = ReadText(relative);
        if (text is null) return null;
        try { return JsonDocument.Parse(text); }
        catch (JsonException) { return null; }
    }

    public static string ProjectPath(string projectId, string? file = null) => file is null ? $"projects/{projectId}" : $"projects/{projectId}/{file}";
}

public class InvalidPathException(string path) : Exception($"Geçersiz dosya yolu: {path}");

public class ChunkOffsetException(long actual, long expected) : Exception($"Parça konumu uyuşmuyor: dosya {actual} bayt, istenen konum {expected}.");
