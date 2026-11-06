namespace AgriStream.Web.Models;

public class DashboardViewModel
{
    public string FieldId { get; set; } = "F1";
    public List<TelemetryReading> Readings { get; set; } = new();
    public List<Device> Devices { get; set; } = new();
    public string? Error { get; set; }

    public double? AvgMoisture => Readings.Count > 0 ? Math.Round(Readings.Average(r => r.SoilMoisture), 1) : null;
    public double? AvgTemperature => Readings.Count > 0 ? Math.Round(Readings.Average(r => r.Temperature), 1) : null;
}
