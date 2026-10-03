using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Data;

public class PanelDbContext(DbContextOptions<PanelDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Job> Jobs => Set<Job>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.Property(u => u.Username).HasMaxLength(100);
            e.HasIndex(u => u.Username).IsUnique();
        });
        model.Entity<Setting>(e =>
        {
            e.HasKey(s => s.Key);
            e.Property(s => s.Key).HasMaxLength(100);
        });
        model.Entity<Project>(e =>
        {
            e.Property(p => p.Id).HasMaxLength(120);
            e.Property(p => p.Title).HasMaxLength(300);
            e.Property(p => p.Format).HasMaxLength(10);
            e.Property(p => p.Series).HasMaxLength(50);
            e.Property(p => p.Theme).HasMaxLength(50);
            e.Property(p => p.Stage).HasMaxLength(20);
            e.Property(p => p.ParentId).HasMaxLength(120);
            e.HasIndex(p => p.UpdatedAt);
        });
        model.Entity<Job>(e =>
        {
            e.Property(j => j.Type).HasMaxLength(20);
            e.Property(j => j.Status).HasMaxLength(20);
            e.Property(j => j.ProjectId).HasMaxLength(120);
            e.HasIndex(j => new { j.Status, j.CreatedAt });
            e.HasIndex(j => j.ProjectId);
        });
    }
}
