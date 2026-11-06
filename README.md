# AgriStream IoT (CLDV7112 Practicum)

Real-time processing system on Azure for a smart-agriculture scenario. Soil sensors send telemetry, drones upload imagery, and farmers trigger irrigation from a web dashboard.

Student number: ST10405518

## Live deployment

- Web app: https://st10405518-web.azurewebsites.net
- Function App: https://st10405518-func.azurewebsites.net

## Architecture

| Layer | Azure service | Role |
| --- | --- | --- |
| Presentation | App Service (ASP.NET Core MVC, .NET 9) | Management web app, cookie authentication |
| Identity and registry | Azure SQL Database | Users, roles, device registry |
| Unstructured data | Blob Storage | Drone images (`drone-images`) |
| NoSQL data | Table Storage | `Telemetry` and `ImageAudit` |
| Messaging | Storage Queue | `irrigation-commands` |
| Compute | Azure Functions (isolated worker) | Four functions below |

### Functions

| Function | Trigger | Purpose |
| --- | --- | --- |
| `DroneImageUploaded` | Blob | Writes an audit row to `ImageAudit` |
| `GetTelemetry` | HTTP GET `/api/telemetry` | Returns the latest readings for a field |
| `TriggerIrrigation` | HTTP POST `/api/irrigation` | Validates the request and queues a command |
| `ProcessIrrigationCommand` | Queue | Sets the device status to `Irrigating` in SQL |

## Repository layout

- `AgriStream.Web` - MVC web application
- `AgriStream.Functions` - Azure Functions project
- `LoadTest` - `loadtest.ps1` load generator
- `docs` - `build-report.js` generates the Word report (`node docs/build-report.js`)
- `AgriStream.sln` - Visual Studio solution

## Run locally

1. Install the Visual Studio **Azure development** workload (Functions Core Tools and Azurite).
2. Start Azurite, then set both `AgriStream.Functions` and `AgriStream.Web` as startup projects.
3. In `AgriStream.Web/appsettings.Development.json`, set the local SQL (LocalDB) and storage connection strings, and the Functions base URL to `http://localhost:7071`.
4. Run. The database and seed users are created on first start.

## Known limitations

Rule-based autoscale and Application Insights could not be enabled on the student subscription: the `Microsoft.Insights` provider is not registered and an Azure Policy restricts App Service plans to the Basic and Shared tiers. The code is instrumented for Application Insights and activates when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set. See section 3.4 of the report.
