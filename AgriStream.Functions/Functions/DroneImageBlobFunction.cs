using Azure.Data.Tables;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace AgriStream.Functions.Functions;

public class DroneImageBlobFunction
{
    private readonly ILogger<DroneImageBlobFunction> _logger;

    public DroneImageBlobFunction(ILogger<DroneImageBlobFunction> logger) => _logger = logger;

    // Function 1: fires whenever a drone image lands in the "drone-images" container.
    // The TableOutput binding writes the audit row, so no manual client code is needed.
    [Function("DroneImageUploaded")]
    [TableOutput("ImageAudit", Connection = "StorageConnection")]
    public TableEntity Run(
        [BlobTrigger("drone-images/{name}", Connection = "StorageConnection")] byte[] content,
        string name)
    {
        _logger.LogInformation("Drone image uploaded: {Name} ({Size} bytes)", name, content.Length);

        return new TableEntity("ImageAudit", $"{DateTime.UtcNow.Ticks:D19}-{Guid.NewGuid():N}")
        {
            { "BlobName", name },
            { "SizeBytes", content.Length },
            { "Status", "Processed" },
            { "ProcessedUtc", DateTime.UtcNow }
        };
    }
}
