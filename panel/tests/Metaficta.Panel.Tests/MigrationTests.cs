using Metaficta.Panel;
using Metaficta.Panel.Data;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Tests;

public class MigrationTests
{
    /// <summary>
    /// Plesk'te MSSQL şeması migration'larla kurulur. Model değişip migration eklenmezse (veya migration yanlış
    /// sağlayıcıyla üretilirse) panel ilk açılışta çöker; bu test bunu CI'da yakalar.
    /// </summary>
    [Fact]
    public void Sql_server_migrations_match_the_model()
    {
        var options = new DbContextOptionsBuilder<PanelDbContext>()
            .UseSqlServer("Server=localhost;Database=design;User Id=x;Password=y;TrustServerCertificate=True")
            .Options;
        using var db = new PanelDbContext(options);
        Assert.False(db.Database.HasPendingModelChanges(), "Model değişti: 'dotnet ef migrations add <Ad>' ile yeni migration ekle (bkz. panel/README.md).");
        Assert.NotEmpty(db.Database.GetMigrations());
    }

    [Fact]
    public void Startup_failure_hints_explain_permission_and_database_problems()
    {
        var permission = StartupFailure.Hint(new FolderNotWritableException(@"C:\site\App_Data", new UnauthorizedAccessException("denied")));
        Assert.Contains("Ek yazma ve değiştirme izinleri", permission);
        var generic = StartupFailure.Hint(new InvalidOperationException("x"));
        Assert.Contains("stdoutLogEnabled", generic);
    }
}
