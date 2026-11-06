using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using AgriStream.Web.Models;

namespace AgriStream.Web.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        return View(); 
    }

    // Lightweight anonymous endpoint for load-test baselines.
    public IActionResult Health() => Ok("healthy");

    // CPU-bound endpoint used by the load test to push App Service CPU past the scale-out threshold.
    public IActionResult Stress(int ms = 200)
    {
        ms = Math.Clamp(ms, 1, 2000);
        var sw = Stopwatch.StartNew();
        double x = 0;
        while (sw.ElapsedMilliseconds < ms) x += Math.Sqrt(Random.Shared.NextDouble());
        return Ok($"burned {ms} ms ({x:F0})");
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
