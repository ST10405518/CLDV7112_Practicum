using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace AgriStream.Functions.Functions;

public class TriggerIrrigationFunction
{
    private readonly ILogger<TriggerIrrigationFunction> _logger;

    public TriggerIrrigationFunction(ILogger<TriggerIrrigationFunction> logger) => _logger = logger;

    public class Result
    {
        // Queue output binding: the string returned here is enqueued.
        [QueueOutput("irrigation-commands", Connection = "StorageConnection")]
        public string? QueueMessage { get; set; }

        [HttpResult]
        public IActionResult Response { get; set; } = default!;
    }

    // Function 3: POST /api/irrigation validates the command and places it on the queue.
    [Function("TriggerIrrigation")]
    public async Task<Result> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "irrigation")] HttpRequest req)
    {
        IrrigationCommand? cmd;
        try
        {
            cmd = await JsonSerializer.DeserializeAsync<IrrigationCommand>(req.Body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException)
        {
            cmd = null;
        }

        if (cmd is null || cmd.DeviceId <= 0 || cmd.DurationMinutes is < 1 or > 240)
            return new Result { Response = new BadRequestObjectResult("Invalid irrigation command.") };

        _logger.LogInformation("Queueing irrigation for device {Id} ({Min} min)", cmd.DeviceId, cmd.DurationMinutes);

        return new Result
        {
            QueueMessage = JsonSerializer.Serialize(cmd),
            Response = new AcceptedResult()
        };
    }
}
