using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Metaficta.Panel.Tests;

/// <summary>Geçici SQLite veritabanı ve geçici depolama klasörüyle çalışan test sunucusu.</summary>
public class PanelFactory : WebApplicationFactory<Program>
{
    public string TempDir { get; } = Directory.CreateTempSubdirectory("metaficta-panel-").FullName;
    public FakeDispatcher Dispatcher { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={Path.Combine(TempDir, "panel.db")}");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("Storage:Path", Path.Combine(TempDir, "storage"));
        builder.UseSetting("DataProtection:KeysPath", Path.Combine(TempDir, "keys"));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IJobDispatcher>();
            services.AddSingleton<IJobDispatcher>(Dispatcher);
        });
    }

    public T With<T>(Func<IServiceProvider, T> action)
    {
        using var scope = Services.CreateScope();
        return action(scope.ServiceProvider);
    }

    public async Task<T> WithAsync<T>(Func<IServiceProvider, Task<T>> action)
    {
        using var scope = Services.CreateScope();
        return await action(scope.ServiceProvider);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try { Directory.Delete(TempDir, recursive: true); } catch (IOException) { }
    }
}

public class FakeDispatcher : IJobDispatcher
{
    public List<int> Dispatched { get; } = [];
    public string? NextError { get; set; }

    public Task<string?> DispatchAsync(Job job, CancellationToken ct = default)
    {
        Dispatched.Add(job.Id);
        return Task.FromResult(NextError);
    }

    public Task<string?> TestAsync(CancellationToken ct = default) => Task.FromResult<string?>(null);
}
