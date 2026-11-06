using System.Text;
using System.Text.Json;
using AgriStream.Web.Models;

namespace AgriStream.Web.Services;

// Calls the HTTP-triggered Azure Functions (GET telemetry, POST irrigation).
public class FunctionsClient
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };
    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly string _key;

    public FunctionsClient(HttpClient http, IConfiguration config)
    {
        _http = http;
        _baseUrl = (config["Functions:BaseUrl"] ?? "").TrimEnd('/');
        _key = config["Functions:Key"] ?? "";
    }

    private string Url(string route, string query = "") =>
        $"{_baseUrl}/api/{route}?{query}{(query.Length > 0 ? "&" : "")}code={Uri.EscapeDataString(_key)}";

    public async Task<List<TelemetryReading>> GetTelemetryAsync(string fieldId, int count = 20)
    {
        var res = await _http.GetAsync(Url("telemetry", $"fieldId={Uri.EscapeDataString(fieldId)}&count={count}"));
        res.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<List<TelemetryReading>>(await res.Content.ReadAsStringAsync(), Json) ?? new();
    }

    public async Task<bool> TriggerIrrigationAsync(int deviceId, int minutes, string user)
    {
        var body = JsonSerializer.Serialize(new { deviceId, durationMinutes = minutes, requestedBy = user });
        var res = await _http.PostAsync(Url("irrigation"), new StringContent(body, Encoding.UTF8, "application/json"));
        return res.IsSuccessStatusCode;
    }
}
