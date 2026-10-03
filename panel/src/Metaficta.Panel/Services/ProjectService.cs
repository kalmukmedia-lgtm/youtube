using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Metaficta.Panel.Data;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Services;

public static class Stages
{
    public static readonly string[] All = ["script", "approved", "voiced", "rendered", "uploaded"];

    public static string Label(string stage) => stage switch
    {
        "script" => "Onay bekliyor",
        "approved" => "Onaylandı",
        "voiced" => "Seslendirildi",
        "rendered" => "Render edildi",
        "uploaded" => "Yüklendi",
        _ => stage,
    };
}

/// <summary>Depodaki script.json / status.json ile Projects tablosunu eşitler ve proje durumunu günceller.</summary>
public class ProjectService(PanelDbContext db, StorageService storage)
{
    /// <summary>Türkçe karakterler kaçış kodu olmadan yazılır (CLI'ın yazdığı biçimle aynı, elle düzenlemeye uygun).</summary>
    private static readonly JsonSerializerOptions Pretty = new() { WriteIndented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    /// <summary>Projenin depodaki dosyalarından tablo kaydını oluşturur/günceller. Dosya yoksa kaydı siler.</summary>
    public async Task<Project?> SyncAsync(string projectId)
    {
        if (!StorageService.IsValidId(projectId)) return null;
        using var script = storage.ReadJson(StorageService.ProjectPath(projectId, "script.json"));
        var project = await db.Projects.FindAsync(projectId);
        if (script is null)
        {
            if (project is not null) db.Projects.Remove(project);
            await db.SaveChangesAsync();
            return null;
        }

        project ??= db.Projects.Add(new Project { Id = projectId }).Entity;
        var root = script.RootElement;
        project.Title = Str(root, "workingTitle") ?? projectId;
        project.Topic = Str(root, "topic") ?? "";
        project.Format = Str(root, "format") ?? "long";
        project.Series = Str(root, "series") ?? "";
        project.Theme = Str(root, "theme") ?? "";
        project.ParentId = Str(root, "parentId");
        if (DateTime.TryParse(Str(root, "createdAt"), null, System.Globalization.DateTimeStyles.AdjustToUniversal, out var created)) project.CreatedAt = created;
        using var status = storage.ReadJson(StorageService.ProjectPath(projectId, "status.json"));
        project.Stage = status is not null ? Str(status.RootElement, "stage") ?? "script" : "script";
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return project;
    }

    /// <summary>Depodaki tüm projeleri tabloya yeniden işler (ör. dosyalar elle yüklendiyse).</summary>
    public async Task<int> SyncAllAsync()
    {
        var ids = storage.ListDirectories("projects").Where(StorageService.IsValidId).ToList();
        foreach (var id in ids) await SyncAsync(id);
        var orphans = await db.Projects.Where(p => !ids.Contains(p.Id)).ToListAsync();
        db.Projects.RemoveRange(orphans);
        await db.SaveChangesAsync();
        return ids.Count;
    }

    /// <summary>status.json'u CLI ile aynı biçimde günceller: { stage, updatedAt, history[] }.</summary>
    public async Task SetStageAsync(string projectId, string stage)
    {
        if (!Stages.All.Contains(stage)) throw new ArgumentException($"Bilinmeyen aşama: {stage}");
        var path = StorageService.ProjectPath(projectId, "status.json");
        var now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        var node = JsonNode.Parse(storage.ReadText(path) ?? "{}") as JsonObject ?? [];
        var history = node["history"] as JsonArray ?? [];
        history.Add(new JsonObject { ["stage"] = stage, ["at"] = now });
        var updated = new JsonObject { ["stage"] = stage, ["updatedAt"] = now, ["history"] = history.DeepClone() };
        await storage.WriteTextAsync(path, updated.ToJsonString(Pretty) + "\n");
        await SyncAsync(projectId);
    }

    /// <summary>Elle düzenlenen script.json'u kaydeder. Geçersiz JSON veya sahnesiz senaryo reddedilir.</summary>
    public async Task<string?> SaveScriptAsync(string projectId, string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object || !doc.RootElement.TryGetProperty("scenes", out var scenes) || scenes.ValueKind != JsonValueKind.Array)
                return "Senaryo bir JSON nesnesi olmalı ve 'scenes' dizisi içermeli.";
            if (Str(doc.RootElement, "id") != projectId) return "'id' alanı proje kimliğiyle aynı kalmalı.";
            await storage.WriteTextAsync(StorageService.ProjectPath(projectId, "script.json"), JsonSerializer.Serialize(doc.RootElement, Pretty) + "\n");
            await SyncAsync(projectId);
            return null;
        }
        catch (JsonException ex)
        {
            return $"Geçersiz JSON: {ex.Message}";
        }
    }

    private static string? Str(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}
