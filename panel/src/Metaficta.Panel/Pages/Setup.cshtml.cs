using System.ComponentModel.DataAnnotations;
using Metaficta.Panel.Data;
using Metaficta.Panel.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Pages;

/// <summary>İlk açılış: yönetici hesabını ve işçi anahtarını oluşturur. Yönetici varsa kapanır.</summary>
public class SetupModel(PanelDbContext db, SettingsService settings) : PageModel
{
    [BindProperty, Required, StringLength(100, MinimumLength = 3)]
    public string Username { get; set; } = "admin";

    [BindProperty, Required, StringLength(200, MinimumLength = 10, ErrorMessage = "Şifre en az 10 karakter olmalı.")]
    public string Password { get; set; } = "";

    [BindProperty, Compare(nameof(Password), ErrorMessage = "Şifreler aynı değil.")]
    public string PasswordAgain { get; set; } = "";

    public async Task<IActionResult> OnGetAsync() => await db.Users.AnyAsync() ? RedirectToPage("/Login") : Page();

    public async Task<IActionResult> OnPostAsync()
    {
        if (await db.Users.AnyAsync()) return RedirectToPage("/Login");
        if (!ModelState.IsValid) return Page();

        var user = new User { Username = Username.Trim(), PasswordHash = "" };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        await settings.GetOrCreateWorkerTokenAsync();
        await LoginModel.SignInAsync(HttpContext, user);
        TempData["Message"] = "Kurulum tamamlandı. Şimdi GitHub bağlantısını ayarla.";
        return RedirectToPage("/Settings/Index");
    }
}
