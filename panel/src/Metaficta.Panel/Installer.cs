using System.Net;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace Metaficta.Panel;

/// <summary>
/// Veritabanı bağlantısı henüz yapılandırılmamışsa çalışan küçük kurulum uygulaması.
/// MSSQL bilgilerini alır, bağlantıyı dener ve App_Data/appsettings.local.json dosyasına yazar.
/// Bu dosya panel güncellenirken (dosyalar yeniden yüklenirken) korunur.
/// </summary>
public static class Installer
{
    public const string LocalSettingsFile = "appsettings.local.json";

    public static string LocalSettingsPath(string contentRoot) => Path.Combine(contentRoot, "App_Data", LocalSettingsFile);

    public static bool IsConfigured(IConfiguration config) => !string.IsNullOrWhiteSpace(config.GetConnectionString("Default"));

    public static void Run(WebApplicationBuilder builder)
    {
        var app = builder.Build();
        var settingsPath = LocalSettingsPath(app.Environment.ContentRootPath);

        app.MapGet("/{**path}", () => Results.Content(Page(), "text/html; charset=utf-8"));
        app.MapPost("/{**path}", async (HttpRequest request, IHostApplicationLifetime lifetime) =>
        {
            var form = await request.ReadFormAsync();
            string F(string key) => form[key].ToString().Trim();
            var connection = new SqlConnectionStringBuilder
            {
                DataSource = F("server"),
                InitialCatalog = F("database"),
                UserID = F("user"),
                Password = form["password"].ToString(),
                TrustServerCertificate = true,
                ConnectTimeout = 15,
            }.ConnectionString;

            try
            {
                await using var sql = new SqlConnection(connection);
                await sql.OpenAsync();
            }
            catch (Exception ex) when (ex is SqlException or InvalidOperationException or ArgumentException)
            {
                return Results.Content(Page(F("server"), F("database"), F("user"), $"Bağlantı kurulamadı: {ex.Message}"), "text/html; charset=utf-8");
            }

            Directory.CreateDirectory(Path.GetDirectoryName(settingsPath)!);
            var json = JsonSerializer.Serialize(
                new { ConnectionStrings = new { Default = connection }, Database = new { Provider = "SqlServer" } },
                new JsonSerializerOptions { WriteIndented = true, Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
            await File.WriteAllTextAsync(settingsPath, json);

            // Uygulama kapanır; IIS bir sonraki istekte paneli yeni ayarlarla yeniden başlatır.
            _ = Task.Delay(1000).ContinueWith(_ => lifetime.StopApplication());
            return Results.Content(Done(), "text/html; charset=utf-8");
        }).DisableAntiforgery();

        app.Run();
    }

    private static string E(string value) => WebUtility.HtmlEncode(value);

    private static string Shell(string body) => $$"""
        <!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Metaficta Panel kurulumu</title>
        <style>
          body{margin:0;background:#0b0a0e;color:#f1ebdf;font:15px/1.55 system-ui,"Segoe UI",sans-serif}
          main{max-width:460px;margin:8vh auto;padding:24px;background:#15131a;border:1px solid #2c2834;border-radius:10px}
          h1{font-size:1.4rem;margin:0 0 .5em}.brand{color:#e8b64c;letter-spacing:.35em;font-weight:800}
          label{display:block;font-size:13px;color:#a39b8d;margin:12px 0 4px}
          input{width:100%;box-sizing:border-box;padding:9px 11px;border-radius:8px;border:1px solid #2c2834;background:#0d0c11;color:#f1ebdf;font:inherit}
          button{margin-top:16px;padding:9px 16px;border-radius:8px;border:0;background:#e8b64c;color:#1a1408;font-weight:700;cursor:pointer}
          .err{color:#e5534b;border:1px solid #e5534b;border-radius:8px;padding:8px 12px;margin:12px 0}.muted{color:#a39b8d;font-size:13px}
        </style></head><body><main><div class="brand">METAFICTA</div>{{body}}</main></body></html>
        """;

    private static string Page(string server = "", string database = "", string user = "", string? error = null) => Shell($"""
        <h1>Veritabanı bağlantısı</h1>
        <p class="muted">Plesk → Veritabanları bölümünde oluşturduğun MSSQL veritabanının bilgilerini gir.
        Bilgiler sunucuda <code>App_Data/{LocalSettingsFile}</code> dosyasına kaydedilir.</p>
        {(error is null ? "" : $"<div class=\"err\">{E(error)}</div>")}
        <form method="post">
          <label>Sunucu (ör. localhost veya mssql.alanadin.com)</label><input name="server" value="{E(server)}" required>
          <label>Veritabanı adı</label><input name="database" value="{E(database)}" required>
          <label>Kullanıcı adı</label><input name="user" value="{E(user)}" required autocomplete="off">
          <label>Şifre</label><input name="password" type="password" required autocomplete="new-password">
          <button>Bağlantıyı test et ve kaydet</button>
        </form>
        """);

    private static string Done() => Shell("""
        <h1>Bağlantı kaydedildi ✔</h1>
        <p>Panel yeni ayarlarla yeniden başlatılıyor. Birkaç saniye sonra sayfayı yenile; yönetici hesabı oluşturma ekranı açılacak.</p>
        <p><a href="/" style="color:#e8b64c">Sayfayı yenile →</a></p>
        """);
}
