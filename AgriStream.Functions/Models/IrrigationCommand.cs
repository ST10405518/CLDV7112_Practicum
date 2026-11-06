namespace AgriStream.Functions.Functions;

// Message placed on the queue by the POST function and consumed by the queue function.
public record IrrigationCommand(int DeviceId, int DurationMinutes, string RequestedBy);
