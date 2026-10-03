using System.Security.Claims;
using Metaficta.Panel.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Metaficta.Panel.Pages;

public class LoginModel(PanelDbContext db) : PageModel
{
    [BindProperty] public string Username { get; set; } = "";
    [BindProperty] public string Password { get; set; } = "";
    public string? Error { get; set; }

    public async Task<IActionResult> OnPostAsync(string? returnUrl)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == Username.Trim());
        var ok = user is not null && new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash, Password) != PasswordVerificationResult.Failed;
        if (!ok)
        {
            // Kaba kuvvet denemelerini yavaşlat.
            await Task.Delay(800);
            Error = "Kullanıcı adı veya şifre hatalı.";
            return Page();
        }
        await SignInAsync(HttpContext, user!);
        return LocalRedirect(Url.IsLocalUrl(returnUrl) ? returnUrl! : "/");
    }

    public static Task SignInAsync(HttpContext http, User user)
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, user.Username), new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())], CookieAuthenticationDefaults.AuthenticationScheme);
        return http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = true });
    }
}
