using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;

namespace AgriStream.Functions.Functions;

public class ProcessIrrigationQueueFunction
{
    private readonly ILogger<ProcessIrrigationQueueFunction> _logger;

    public ProcessIrrigationQueueFunction(ILogger<ProcessIrrigationQueueFunction> logger) => _logger = logger;

    // Function 4: consumes irrigation commands and updates the device registry in Azure SQL.
    // Failures throw so the runtime retries, then moves the message to the poison queue.
    [Function("ProcessIrrigationCommand")]
    public async Task Run(
        [QueueTrigger("irrigation-commands", Connection = "StorageConnection")] string message)
    {
        var cmd = JsonSerializer.Deserialize<IrrigationCommand>(message,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Unreadable irrigation command.");

        await using var conn = new SqlConnection(Environment.GetEnvironmentVariable("SqlConnection"));
        await conn.OpenAsync();

        await using var sql = new SqlCommand(
            @"UPDATE Devices
              SET Status = 'Irrigating', LastCommandUtc = SYSUTCDATETIME()
              WHERE DeviceId = @id", conn);
        sql.Parameters.AddWithValue("@id", cmd.DeviceId);

        var rows = await sql.ExecuteNonQueryAsync();
        if (rows == 0)
            _logger.LogWarning("Device {Id} not found in registry.", cmd.DeviceId);
        else
            _logger.LogInformation("Device {Id} set to Irrigating for {Min} min.", cmd.DeviceId, cmd.DurationMinutes);
    }
}
