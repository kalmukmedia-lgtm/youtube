using System.Security.Cryptography;
using Metaficta.Panel.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Services;

public static class SettingKeys
{
    public const string GitHubOwner = "github.owner";
    public const string GitHubRepo = "github.repo";
    public const string GitHubWorkflow = "github.workflow";
    public const string GitHubRef = "github.ref";
    public const string GitHubToken = "github.token";
    public const string WorkerToken = "worker.token";
}

/// <summary>Ayarlar tablosu; token gibi gizli değerler DataProtection ile şifrelenerek saklanır.</summary>
public class SettingsService(PanelDbContext db, IDataProtectionProvider protection)
{
    private readonly IDataProtector protector = protection.CreateProtector("Metaficta.Panel.Settings");

    public async Task<string?> GetAsync(string key) => (await db.Settings.FindAsync(key))?.Value is { Length: > 0 } v ? v : null;

    public async Task SetAsync(string key, string? value)
    {
        var setting = await db.Settings.FindAsync(key);
        if (setting is null) db.Settings.Add(new Setting { Key = key, Value = value ?? "" });
        else setting.Value = value ?? "";
        await db.SaveChangesAsync();
    }

    public async Task<string?> GetSecretAsync(string key)
    {
        var value = await GetAsync(key);
        if (value is null) return null;
        try { return protector.Unprotect(value); }
        catch (CryptographicException) { return null; }
    }

    public Task SetSecretAsync(string key, string value) => SetAsync(key, protector.Protect(value));

    public async Task<GitHubSettings> GetGitHubAsync() => new(
        await GetAsync(SettingKeys.GitHubOwner),
        await GetAsync(SettingKeys.GitHubRepo),
        await GetAsync(SettingKeys.GitHubWorkflow) ?? "worker.yml",
        await GetAsync(SettingKeys.GitHubRef),
        await GetSecretAsync(SettingKeys.GitHubToken));

    /// <summary>İşçinin panele bağlanırken kullandığı anahtar; yoksa üretilir.</summary>
    public async Task<string> GetOrCreateWorkerTokenAsync()
    {
        var token = await GetSecretAsync(SettingKeys.WorkerToken);
        if (token is not null) return token;
        return await RegenerateWorkerTokenAsync();
    }

    public async Task<string> RegenerateWorkerTokenAsync()
    {
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        await SetSecretAsync(SettingKeys.WorkerToken, token);
        return token;
    }
}

/// <param name="Ref">Boşsa deponun varsayılan dalı kullanılır.</param>
public record GitHubSettings(string? Owner, string? Repo, string Workflow, string? Ref, string? Token)
{
    public bool IsComplete => !string.IsNullOrWhiteSpace(Owner) && !string.IsNullOrWhiteSpace(Repo) && !string.IsNullOrWhiteSpace(Token);
}
