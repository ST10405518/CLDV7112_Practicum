using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace AgriStream.Web.Services;

// Wraps Blob and Table access so controllers stay thin.
public class StorageService
{
    private readonly BlobContainerClient _images;
    private readonly TableClient _telemetry;
    private readonly TableClient _audit;

    public StorageService(IConfiguration config)
    {
        var conn = config["Storage:ConnectionString"];
        _images = new BlobContainerClient(conn, "drone-images");
        _telemetry = new TableClient(conn, "Telemetry");
        _audit = new TableClient(conn, "ImageAudit");
        _images.CreateIfNotExists();
        _telemetry.CreateIfNotExists();
        _audit.CreateIfNotExists();
    }

    public async Task UploadImageAsync(IFormFile file)
    {
        var blobName = $"{DateTime.UtcNow:yyyyMMddHHmmss}-{Path.GetFileName(file.FileName)}";
        await using var stream = file.OpenReadStream();
        await _images.GetBlobClient(blobName).UploadAsync(stream,
            new BlobHttpHeaders { ContentType = file.ContentType });
    }

    public async Task<List<(string Name, DateTimeOffset? Created, string Url)>> ListImagesAsync()
    {
        var list = new List<(string, DateTimeOffset?, string)>();
        await foreach (var b in _images.GetBlobsAsync())
            list.Add((b.Name, b.Properties.CreatedOn, _images.GetBlobClient(b.Name).Uri.ToString()));
        return list.OrderByDescending(x => x.Item2).ToList();
    }

    public async Task<List<TableEntity>> GetAuditAsync(int max = 20)
    {
        var rows = new List<TableEntity>();
        await foreach (var e in _audit.QueryAsync<TableEntity>())
        {
            rows.Add(e);
        }
        return rows.OrderByDescending(r => r.RowKey).Take(max).ToList();
    }

    // Writes simulated sensor readings. Reverse-tick RowKey keeps newest rows first in a partition.
    public async Task SeedTelemetryAsync(string fieldId, int count)
    {
        var rnd = Random.Shared;
        var actions = new List<TableTransactionAction>();
        for (var i = 0; i < count; i++)
        {
            var ts = DateTimeOffset.UtcNow.AddSeconds(-i * 30);
            var entity = new TableEntity(fieldId, $"{DateTime.MaxValue.Ticks - ts.UtcTicks:D19}-{i}")
            {
                { "SensorId", $"S{rnd.Next(1, 6)}" },
                { "SoilMoisture", Math.Round(20 + rnd.NextDouble() * 40, 1) },
                { "Temperature", Math.Round(15 + rnd.NextDouble() * 20, 1) },
                { "RecordedUtc", ts }
            };
            actions.Add(new TableTransactionAction(TableTransactionActionType.UpsertReplace, entity));
        }
        await _telemetry.SubmitTransactionAsync(actions);
    }
}
