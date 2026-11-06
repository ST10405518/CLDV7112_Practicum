using AgriStream.Web.Data;
using AgriStream.Web.Models;
using AgriStream.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgriStream.Web.Controllers;

[Authorize]
public class DashboardController : Controller
{
    private readonly AppDbContext _db;
    private readonly FunctionsClient _functions;
    private readonly StorageService _storage;

    public DashboardController(AppDbContext db, FunctionsClient functions, StorageService storage)
    {
        _db = db;
        _functions = functions;
        _storage = storage;
    }

    public async Task<IActionResult> Index(string fieldId = "F1")
    {
        var vm = new DashboardViewModel
        {
            FieldId = fieldId,
            Devices = await _db.Devices.AsNoTracking().Where(d => d.FieldId == fieldId).ToListAsync()
        };

        try
        {
            vm.Readings = await _functions.GetTelemetryAsync(fieldId);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            vm.Error = "Telemetry service is currently unavailable.";
        }

        return View(vm);
    }

    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = $"{Roles.Farmer},{Roles.Admin}")]
    public async Task<IActionResult> Irrigate(int deviceId, string fieldId, int minutes = 30)
    {
        var ok = await _functions.TriggerIrrigationAsync(deviceId, minutes, User.Identity!.Name!);
        TempData[ok ? "Message" : "Error"] = ok
            ? "Irrigation command queued."
            : "Could not queue the irrigation command.";
        return RedirectToAction(nameof(Index), new { fieldId });
    }

    [HttpPost, ValidateAntiForgeryToken]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> SimulateSensors(string fieldId)
    {
        await _storage.SeedTelemetryAsync(fieldId, 20);
        TempData["Message"] = "20 simulated readings written to Table Storage.";
        return RedirectToAction(nameof(Index), new { fieldId });
    }
}
