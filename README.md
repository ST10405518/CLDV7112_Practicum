# AgriStream IoT (CLDV7112 Practicum)

Real-time processing system on Azure for a smart-agriculture scenario. Soil sensors send telemetry continuously, drones upload high-resolution imagery in bursts, and farmers trigger irrigation from a web dashboard.

**Student number:** ST10405518
**Repository:** https://github.com/ST10405518/CLDV7112_Practicum

## 1. Where it is hosted

The application is deployed to Microsoft Azure, region **South Africa North**, resource group `RSG-RCGPBR-ST10405518-SANORTH`.

| Component | Azure service | Address |
| --- | --- | --- |
| Web application | App Service (Linux, B1) `st10405518-web` | https://st10405518-web.azurewebsites.net |
| Serverless pipeline | Function App `st10405518-func` | https://st10405518-func.azurewebsites.net |
| Relational data | Azure SQL `st10405518-sql` / database `agristream` | `st10405518-sql.database.windows.net` |
| Files and NoSQL | Storage account `st10405518stor` | Blobs `drone-images`, Tables `Telemetry` + `ImageAudit`, Queue `irrigation-commands` |

Open **https://st10405518-web.azurewebsites.net** in a browser to use the system. The first page load after an idle period can take up to a minute while the site warms up.

## 2. Login credentials

| Role | Username | Password | Can do |
| --- | --- | --- | --- |
| Admin | `admin` | `Admin@123` | Everything, plus simulating sensor readings |
| Farmer | `Musa` | `Test@123` | View dashboard, trigger irrigation, upload drone images |
| Agronomist | `Agronomist` | `Test@123` | View dashboard and drone images only |

The Admin account is seeded automatically. The Farmer and Agronomist accounts are ordinary registered accounts; if one does not exist yet, create it on the **Register** page by choosing the matching role. Self-registration cannot create Admin accounts.

## 3. How to use the web app

1. **Log in** at https://st10405518-web.azurewebsites.net with one of the accounts above.
2. **Dashboard** — the landing page. Pick a field to see its devices and the latest sensor readings.
3. **Simulate sensor readings** (Admin only) — writes 20 synthetic readings into the `Telemetry` table and fills the dashboard table.
4. **Trigger Irrigation** (Farmer and Admin) — sends an HTTP POST to the Function App, which queues a command. A queue-triggered function then sets the device status to `Irrigating` in Azure SQL. Refresh after ~10 seconds to see the status change.
5. **Drone Images** — upload a JPEG or PNG. The file goes to Blob Storage; a blob-triggered function logs it in the `ImageAudit` table. Refresh after ~20 seconds to see the audit row with blob name, size, status and processed time.
6. **Register** — create additional Farmer or Agronomist accounts to demonstrate role-based access.

## 4. Architecture

| Layer | Azure service | Role |
| --- | --- | --- |
| Presentation | App Service (ASP.NET Core MVC, .NET 9) | Web app; stateless, cookie authentication |
| Identity and registry | Azure SQL Database | `Users` (roles) and `Devices` tables |
| Unstructured data | Blob Storage | Drone images (`drone-images`) |
| NoSQL data | Table Storage | `Telemetry` (partitioned by field) and `ImageAudit` |
| Messaging | Storage Queue | `irrigation-commands` |
| Compute | Azure Functions (isolated worker, .NET 9) | Four functions below |
| Observability | Azure Monitor metrics | Plan CPU/memory; Application Insights wired in code but blocked — see section 8 |

### The four functions

| Function | Trigger | Purpose |
| --- | --- | --- |
| `DroneImageUploaded` | Blob (`drone-images/{name}`) | Writes an audit row to `ImageAudit` via a Table output binding |
| `GetTelemetry` | HTTP GET `/api/telemetry?fieldId=...` | Returns the newest readings for a field |
| `TriggerIrrigation` | HTTP POST `/api/irrigation` | Validates the request, queues a command (returns 202) |
| `ProcessIrrigationCommand` | Queue (`irrigation-commands`) | Updates the device status in Azure SQL |

### Data flows

- **Image upload:** MVC → Blob → `DroneImageUploaded` → `ImageAudit` row → shown on the Drone Images page.
- **Dashboard:** MVC → `GetTelemetry` → newest `Telemetry` rows for the field → rendered in the table.
- **Irrigation:** MVC → `TriggerIrrigation` → queue → `ProcessIrrigationCommand` → `Devices.Status = Irrigating` in SQL.

## 5. Repository layout

| Path | Contents |
| --- | --- |
| `AgriStream.sln` | Visual Studio solution (both projects) |
| `AgriStream.Web` | ASP.NET Core MVC web application |
| `AgriStream.Functions` | Azure Functions project |
| `LoadTest/loadtest.ps1` | Load generator for task (e) |
| `docs/build-report.js` | Generates the Word report: `node docs/build-report.js` |
| `ST10405518_CLDV7112_Practicum.docx` | The submission report |

## 6. Running locally (optional)

The submission runs in Azure; local running is only needed for development.

1. Install the Visual Studio **Azure development** workload (Azure Functions Core Tools and Azurite are included).
2. Start **Azurite** (the storage emulator) — `local.settings.json` uses `UseDevelopmentStorage=true`.
3. Open `AgriStream.sln`. Right-click the solution → **Configure Startup Projects** → **Multiple startup projects** → set both `AgriStream.Web` and `AgriStream.Functions` to **Start**.
4. Ensure `AgriStream.Web/appsettings.Development.json` has a LocalDB connection string and `Functions:BaseUrl` set to `http://localhost:7071`.
5. Press F5. The SQL database, admin user and demo devices are created on first start.

## 7. Security notes

- No secrets are in source control. Azure connection strings and the function key live in App Service / Function App settings.
- Passwords are stored as salted PBKDF2 hashes (100,000 iterations, SHA-256).
- The demo passwords above are for marking only and should be changed afterwards.

## 8. Known limitation (documented in the report)

Rule-based autoscale and Application Insights could not be enabled on the student subscription: the `Microsoft.Insights` resource provider is not registered, and a college Azure Policy restricts App Service plans to the Basic and Shared tiers (rule-based autoscale requires Standard or higher). The application is instrumented and enables Application Insights automatically when `APPLICATIONINSIGHTS_CONNECTION_STRING` is provided. A manual scale-out to two instances was demonstrated instead. See section 3.4 of the report for evidence.
