using System.Security.Claims;
using AgriStream.Web.Data;
using AgriStream.Web.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriStream.Web.Controllers;

public class AccountController : Controller
{
    private readonly AppDbContext _db;

    public AccountController(AppDbContext db) => _db = db;

    [HttpGet]
    public IActionResult Login() => View(new LoginViewModel());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginViewModel vm)
    {
        if (!ModelState.IsValid) return View(vm);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == vm.Username);
        if (user is null || !PasswordHelper.Verify(vm.Password, user.PasswordHash))
        {
            ModelState.AddModelError("", "Invalid username or password.");
            return View(vm);
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)));

        return RedirectToAction("Index", "Dashboard");
    }

    [HttpGet]
    public IActionResult Register() => View(new RegisterViewModel());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterViewModel vm)
    {
        // Self-registration may not create Admins; those are seeded or assigned manually in SQL.
        if (vm.Role == Roles.Admin || !Roles.All.Contains(vm.Role))
            ModelState.AddModelError(nameof(vm.Role), "Choose Farmer or Agronomist.");

        if (ModelState.IsValid && await _db.Users.AnyAsync(u => u.Username == vm.Username))
            ModelState.AddModelError(nameof(vm.Username), "Username already taken.");

        if (!ModelState.IsValid) return View(vm);

        _db.Users.Add(new AppUser
        {
            Username = vm.Username,
            PasswordHash = PasswordHelper.Hash(vm.Password),
            Role = vm.Role
        });
        await _db.SaveChangesAsync();
        return RedirectToAction(nameof(Login));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }
}
