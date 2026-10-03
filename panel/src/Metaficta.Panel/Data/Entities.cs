namespace Metaficta.Panel.Data;

public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
}

/// <summary>Anahtar/değer ayarları (GitHub bağlantısı, işçi anahtarı). Gizli değerler DataProtection ile şifrelenir.</summary>
public class Setting
{
    public required string Key { get; set; }
    public string Value { get; set; } = "";
}

/// <summary>Proje özeti. Asıl kaynak depolamadaki script.json / status.json dosyalarıdır; bu tablo listeleme içindir.</summary>
public class Project
{
    public required string Id { get; set; }
    public string Title { get; set; } = "";
    public string Topic { get; set; } = "";
    public string Format { get; set; } = "long";
    public string Series { get; set; } = "";
    public string Theme { get; set; } = "";
    public string Stage { get; set; } = "script";
    public string? ParentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public static class JobStatus
{
    public const string Queued = "queued";
    public const string Running = "running";
    public const string Succeeded = "succeeded";
    public const string Failed = "failed";
}

public static class JobTypes
{
    public const string Script = "script";
    public const string Shorts = "shorts";
    public const string Voice = "voice";
    public const string Images = "images";
    public const string Stills = "stills";
    public const string Render = "render";
    public const string Produce = "produce";
    public const string Character = "character";

    public static readonly string[] All = [Script, Shorts, Voice, Images, Stills, Render, Produce, Character];

    public static string Label(string type) => type switch
    {
        Script => "Senaryo",
        Shorts => "Shorts türetme",
        Voice => "Seslendirme",
        Images => "Görseller",
        Stills => "Önizleme kareleri",
        Render => "Render",
        Produce => "Hepsini üret",
        Character => "Karakter portreleri",
        _ => type,
    };
}

public class Job
{
    public int Id { get; set; }
    public required string Type { get; set; }
    public string? ProjectId { get; set; }
    public string Status { get; set; } = JobStatus.Queued;
    /// <summary>İşe özel parametreler (JSON).</summary>
    public string ParamsJson { get; set; } = "{}";
    public string Log { get; set; } = "";
    public string? Error { get; set; }
    /// <summary>İşin oluşturduğu projeler (script/shorts işleri), virgülle ayrılmış.</summary>
    public string? ResultProjectIds { get; set; }
    public string? DispatchError { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}
