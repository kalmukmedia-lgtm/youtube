using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Data.SqlClient;

namespace Metaficta.Panel;

public static class StartupChecks
{
    /// <summary>Klasörün oluşturulabildiğini ve içine yazılabildiğini dener.</summary>
    public static void EnsureWritable(string directory)
    {
        try
        {
            Directory.CreateDirectory(directory);
            var probe = Path.Combine(directory, ".write-test");
            File.WriteAllText(probe, DateTime.UtcNow.ToString("O"));
            File.Delete(probe);
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException or IOException)
        {
            throw new FolderNotWritableException(directory, ex);
        }
    }
}

public class FolderNotWritableException(string directory, Exception inner)
    : Exception($"'{directory}' klasörüne yazılamıyor: {inner.Message}", inner)
{
    public string Directory { get; } = directory;
}

/// <summary>Panel başlatılamadığında her isteğe hatayı, olası çözümü ve sunucu bilgisini gösteren sayfa.</summary>
public static class StartupFailure
{
    public static void Run(string[] args, Exception error)
    {
        var page = Render(error);
        TryWriteLog(error);
        var app = WebApplication.CreateBuilder(args).Build();
        app.Run(async context =>
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.WriteAsync(page);
        });
        app.Run();
    }

    public static string Hint(Exception error)
    {
        var all = Chain(error).ToList();
        if (all.OfType<FolderNotWritableException>().FirstOrDefault() is { } folder)
        {
            return $"""
                Uygulamanın <code>{E(folder.Directory)}</code> klasörüne yazma izni yok. Panel ayarları, şifreleme anahtarlarını ve proje dosyalarını bu klasöre yazar.<br><br>
                <b>Çözüm (Plesk):</b> Web Siteleri ve Alan Adları → sitenin <b>Hosting Ayarları</b> → <b>"Ek yazma ve değiştirme izinleri"</b> seçeneğini işaretle → Tamam.
                Bu seçenek yoksa: <b>Dosyalar</b> → sitenin kök klasörü → <code>App_Data</code> klasörünü oluştur → <b>İzinleri Değiştir</b> → uygulama havuzu kullanıcısına (Plesk IIS WP User / IIS_IUSRS) <b>Değiştirme</b> ve <b>Yazma</b> izni ver.
                Sonra sayfayı yenile.
                """;
        }
        if (all.OfType<SqlException>().Any())
        {
            return """
                Veritabanına bağlanılamadı veya tablolar oluşturulamadı.<br><br>
                <b>Çözüm:</b> Plesk'teki MSSQL bilgilerini (sunucu, veritabanı, kullanıcı, şifre) kontrol et. Bilgileri yeniden girmek için
                <code>App_Data/appsettings.local.json</code> dosyasını sil ve sayfayı yenile; kurulum ekranı tekrar açılır.
                Veritabanı kullanıcısının tablo oluşturma yetkisi (db_owner) olmalı.
                """;
        }
        return """
            Beklenmeyen bir başlatma hatası. Aşağıdaki hata ve sunucu bilgisiyle birlikte bildir.
            Daha fazla ayrıntı için <code>web.config</code> içinde <code>stdoutLogEnabled="true"</code> yapıp kökte <code>logs</code> klasörü oluşturabilirsin.
            """;
    }

    private static string Render(Exception error)
    {
        var details = new StringBuilder();
        foreach (var e in Chain(error)) details.AppendLine($"{e.GetType().FullName}: {e.Message}");
        return $$"""
            <!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Metaficta Panel başlatılamadı</title>
            <style>
              body{margin:0;background:#0b0a0e;color:#f1ebdf;font:15px/1.6 system-ui,"Segoe UI",sans-serif}
              main{max-width:760px;margin:6vh auto;padding:24px;background:#15131a;border:1px solid #2c2834;border-radius:10px}
              h1{font-size:1.4rem;margin:.3em 0}.brand{color:#e8b64c;letter-spacing:.35em;font-weight:800}
              pre{background:#08070a;border:1px solid #2c2834;border-radius:8px;padding:12px;white-space:pre-wrap;word-break:break-word;font-size:13px}
              code{color:#e8b64c}.hint{border-left:3px solid #e8b64c;padding:8px 14px;background:#1d1a24;border-radius:0 8px 8px 0}
              .muted{color:#a39b8d;font-size:13px}
            </style></head><body><main>
            <div class="brand">METAFICTA</div>
            <h1>Panel başlatılamadı</h1>
            <div class="hint">{{Hint(error)}}</div>
            <h3>Hata</h3><pre>{{E(details.ToString())}}</pre>
            <h3>Sunucu</h3><pre>{{E(ServerInfo())}}</pre>
            <p class="muted">Bu sayfa yalnızca panel başlatılamadığında görünür. Sorun giderilip site yeniden başladığında normal panel açılır
            (Plesk'te siteyi durdurup başlatabilir veya <code>web.config</code> dosyasını yeniden kaydedebilirsin).</p>
            </main></body></html>
            """;
    }

    public static string ServerInfo() =>
        $"İşletim sistemi: {RuntimeInformation.OSDescription}\n" +
        $".NET: {RuntimeInformation.FrameworkDescription}\n" +
        $"Süreç mimarisi: {RuntimeInformation.ProcessArchitecture} (64-bit süreç: {Environment.Is64BitProcess})\n" +
        $"Uygulama klasörü: {AppContext.BaseDirectory}\n" +
        $"Kullanıcı: {Environment.UserName}";

    private static IEnumerable<Exception> Chain(Exception error)
    {
        for (var e = error; e is not null; e = e.InnerException)
        {
            if (e is AggregateException agg && agg.InnerExceptions.Count > 1)
            {
                foreach (var inner in agg.InnerExceptions) yield return inner;
                yield break;
            }
            yield return e;
        }
    }

    /// <summary>Hata ayrıntısını (yığın izi dahil) yazılabilen ilk konuma kaydeder; sayfada yığın izi gösterilmez.</summary>
    private static void TryWriteLog(Exception error)
    {
        var text = $"[{DateTime.UtcNow:O}]\n{ServerInfo()}\n{error}\n\n";
        foreach (var dir in new[] { Path.Combine(AppContext.BaseDirectory, "App_Data"), Path.Combine(AppContext.BaseDirectory, "logs"), Path.GetTempPath() })
        {
            try
            {
                File.AppendAllText(Path.Combine(dir, "metaficta-startup-error.log"), text);
                return;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                // sıradaki konumu dene
            }
        }
    }

    private static string E(string value) => WebUtility.HtmlEncode(value);
}
