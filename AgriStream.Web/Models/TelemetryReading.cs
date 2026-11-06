namespace AgriStream.Web.Models;

// Shape of one reading returned by the GetTelemetry function.
public class TelemetryReading
{
    public string? FieldId { get; set; }
    public string? SensorId { get; set; }
    public double SoilMoisture { get; set; }
    public double Temperature { get; set; }
    public DateTimeOffset RecordedUtc { get; set; }
}
