using System.Text.Json;
using Metaficta.Panel.Data;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Services;

public class JobService(PanelDbContext db, IJobDispatcher dispatcher, ProjectService projects, ILogger<JobService> logger)
{
    private const int MaxLogLength = 200_000;
    /// <summary>GitHub Actions iş süresi sınırı 6 saat; bundan uzun süren "çalışıyor" işler takılmış sayılır.</summary>
    private static readonly TimeSpan StaleAfter = TimeSpan.FromHours(6);

    public async Task<Job> CreateAsync(string type, string? projectId, object? parameters = null, CancellationToken ct = default)
    {
        if (!JobTypes.All.Contains(type)) throw new ArgumentException($"Bilinmeyen iş tipi: {type}");
        var job = new Job { Type = type, ProjectId = projectId, ParamsJson = JsonSerializer.Serialize(parameters ?? new { }) };
        db.Jobs.Add(job);
        await db.SaveChangesAsync(ct);
        await DispatchAsync(job, ct);
        return job;
    }

    /// <summary>İşçiyi (yeniden) tetikler; hata olursa iş kuyrukta kalır ve hata gösterilir.</summary>
    public async Task DispatchAsync(Job job, CancellationToken ct = default)
    {
        job.DispatchError = await dispatcher.DispatchAsync(job, ct);
        if (job.DispatchError is not null) logger.LogWarning("Job {Id} dispatch failed: {Error}", job.Id, job.DispatchError);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// İşçi için işi "çalışıyor" durumuna alır. Kimlik verilirse o iş, verilmezse en eski kuyruktaki iş alınır.
    /// Durum kontrolü güncelleme sorgusunun içinde yapıldığı için aynı iş iki kez alınamaz.
    /// </summary>
    public async Task<Job?> ClaimAsync(int? jobId, CancellationToken ct = default)
    {
        var candidates = db.Jobs.Where(j => j.Status == JobStatus.Queued);
        if (jobId is not null) candidates = candidates.Where(j => j.Id == jobId);
        var ids = await candidates.OrderBy(j => j.CreatedAt).ThenBy(j => j.Id).Select(j => j.Id).Take(5).ToListAsync(ct);
        foreach (var id in ids)
        {
            var now = DateTime.UtcNow;
            var claimed = await db.Jobs.Where(j => j.Id == id && j.Status == JobStatus.Queued)
                .ExecuteUpdateAsync(s => s.SetProperty(j => j.Status, JobStatus.Running).SetProperty(j => j.StartedAt, now), ct);
            if (claimed == 1)
            {
                var job = await db.Jobs.AsNoTracking().FirstAsync(j => j.Id == id, ct);
                return job;
            }
        }
        return null;
    }

    public async Task AppendLogAsync(int jobId, string text, CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([jobId], ct) ?? throw new KeyNotFoundException();
        var log = job.Log + text;
        job.Log = log.Length > MaxLogLength ? "…\n" + log[^MaxLogLength..] : log;
        await db.SaveChangesAsync(ct);
    }

    public async Task CompleteAsync(int jobId, bool success, string? error, IReadOnlyList<string>? projectIds, CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([jobId], ct) ?? throw new KeyNotFoundException();
        job.Status = success ? JobStatus.Succeeded : JobStatus.Failed;
        job.Error = error;
        job.FinishedAt = DateTime.UtcNow;
        var created = (projectIds ?? []).Where(StorageService.IsValidId).ToList();
        if (created.Count > 0) job.ResultProjectIds = string.Join(",", created);
        await db.SaveChangesAsync(ct);

        foreach (var id in created.Append(job.ProjectId).OfType<string>().Distinct()) await projects.SyncAsync(id);
    }

    /// <summary>Takılmış (6 saatten uzun çalışan) işleri başarısız sayar.</summary>
    public async Task<int> FailStaleAsync(CancellationToken ct = default)
    {
        var limit = DateTime.UtcNow - StaleAfter;
        return await db.Jobs.Where(j => j.Status == JobStatus.Running && j.StartedAt < limit)
            .ExecuteUpdateAsync(s => s.SetProperty(j => j.Status, JobStatus.Failed).SetProperty(j => j.Error, "Zaman aşımı: işçi 6 saat içinde sonuç bildirmedi."), ct);
    }

    /// <summary>Başarısız veya takılmış bir işi aynı parametrelerle yeniden kuyruğa ekler.</summary>
    public async Task<Job> RetryAsync(int jobId, CancellationToken ct = default)
    {
        var job = await db.Jobs.FindAsync([jobId], ct) ?? throw new KeyNotFoundException();
        return await CreateAsync(job.Type, job.ProjectId, JsonSerializer.Deserialize<JsonElement>(job.ParamsJson), ct);
    }
}
