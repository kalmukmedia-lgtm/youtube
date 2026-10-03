using Metaficta.Panel;
using Metaficta.Panel.Api;
using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Veritabanı dosyası (SQLite), şifreleme anahtarları ve depo için çalışma klasörü.
Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "App_Data"));

// Sunucuya özel ayarlar (veritabanı bağlantısı) App_Data'da tutulur; panel güncellenirken korunur.
builder.Configuration.AddJsonFile(Installer.LocalSettingsPath(builder.Environment.ContentRootPath), optional: true, reloadOnChange: false);

if (!Installer.IsConfigured(builder.Configuration))
{
    Installer.Run(builder);
    return;
}

// Veritabanı: Plesk'te MSSQL. Testler ve yerel deneme için SQLite da desteklenir.
var provider = builder.Configuration["Database:Provider"] ?? "SqlServer";
var connectionString = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<PanelDbContext>(options =>
{
    if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase)) options.UseSqlite(connectionString);
    else options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
});

// Şifreleme anahtarları App_Data'da tutulur (paylaşımlı hosting'de kullanıcı profili olmayabilir).
var keysDir = builder.Configuration["DataProtection:KeysPath"] ?? Path.Combine(builder.Environment.ContentRootPath, "App_Data", "keys");
builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keysDir)).SetApplicationName("Metaficta.Panel");

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Login";
        options.LogoutPath = "/Logout";
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.SlidingExpiration = true;
        options.Cookie.Name = "metaficta.auth";
    });
builder.Services.AddAuthorization();
builder.Services.AddRazorPages(options =>
{
    options.Conventions.AuthorizeFolder("/");
    options.Conventions.AllowAnonymousToPage("/Login");
    options.Conventions.AllowAnonymousToPage("/Setup");
    options.Conventions.AllowAnonymousToPage("/Error");
});

builder.Services.AddSingleton<StorageService>();
builder.Services.AddScoped<SettingsService>();
builder.Services.AddScoped<ProjectService>();
builder.Services.AddScoped<JobService>();
builder.Services.AddHttpClient<IJobDispatcher, GitHubJobDispatcher>(c => c.Timeout = TimeSpan.FromSeconds(20));

var app = builder.Build();

// Şema: SQL Server'da migration'lar, SQLite'ta doğrudan oluşturma.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PanelDbContext>();
    if (db.Database.IsSqlServer()) db.Database.Migrate();
    else db.Database.EnsureCreated();
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseStaticFiles();
app.UseRouting();

// İlk kurulum: henüz yönetici yoksa tüm sayfalar kurulum sayfasına yönlenir.
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    if (!path.StartsWithSegments("/Setup") && !path.StartsWithSegments("/api") && !path.StartsWithSegments("/css") && !path.StartsWithSegments("/favicon.ico"))
    {
        var db = context.RequestServices.GetRequiredService<PanelDbContext>();
        if (!await db.Users.AnyAsync())
        {
            context.Response.Redirect("/Setup");
            return;
        }
    }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

app.MapWorkerApi();

// Panelde görüntülenen dosyalar (görsel, ses, video) — sadece giriş yapmış kullanıcıya.
app.MapGet("/media/{**path}", (string path, StorageService storage) =>
{
    try
    {
        var full = storage.Resolve(path);
        return File.Exists(full) ? Results.File(full, WorkerApi.ContentType(full), enableRangeProcessing: true) : Results.NotFound();
    }
    catch (InvalidPathException)
    {
        return Results.BadRequest();
    }
}).RequireAuthorization();

app.MapRazorPages();

app.Run();

public partial class Program;
