using AgriStream.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AgriStream.Web.Controllers;

[Authorize]
public class MediaController : Controller
{
    private static readonly string[] AllowedTypes = { "image/jpeg", "image/png" };
    private readonly StorageService _storage;

    public MediaController(StorageService storage) => _storage = storage;

    public async Task<IActionResult> Index()
    {
        ViewBag.Audit = await _storage.GetAuditAsync();
        return View(await _storage.ListImagesAsync());
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        if (file is null || file.Length == 0 || !AllowedTypes.Contains(file.ContentType))
        {
            TempData["Error"] = "Please choose a JPEG or PNG image.";
            return RedirectToAction(nameof(Index));
        }

        await _storage.UploadImageAsync(file);
        TempData["Message"] = "Image uploaded; the blob function will log its audit entry shortly.";
        return RedirectToAction(nameof(Index));
    }
}
