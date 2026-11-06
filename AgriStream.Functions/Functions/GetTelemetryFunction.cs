using Azure.Data.Tables;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace AgriStream.Functions.Functions;

public class GetTelemetryFunction
{
    // Function 2: returns the latest sensor readings for a field (GET /api/telemetry?fieldId=F1&count=20).
    [Function("GetTelemetry")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "telemetry")] HttpRequest req)
    {
        var fieldId = req.Query["fieldId"].ToString();
        if (string.IsNullOrWhiteSpace(fieldId))
            return new BadRequestObjectResult("fieldId query parameter is required.");

        if (!int.TryParse(req.Query["count"], out var count) || count is < 1 or > 100)
            count = 20;

        var table = new TableClient(Environment.GetEnvironmentVariable("StorageConnection"), "Telemetry");
        await table.CreateIfNotExistsAsync();

        // RowKey is a reverse timestamp, so the newest rows sort first within a partition.
        var readings = new List<object>();
        await foreach (var e in table.QueryAsync<TableEntity>(x => x.PartitionKey == fieldId, maxPerPage: count))
        {
            readings.Add(new
            {
                fieldId = e.PartitionKey,
                sensorId = e.GetString("SensorId"),
                soilMoisture = e.GetDouble("SoilMoisture"),
                temperature = e.GetDouble("Temperature"),
                recordedUtc = e.GetDateTimeOffset("RecordedUtc")
            });
            if (readings.Count >= count) break;
        }

        return new OkObjectResult(readings);
    }
}
