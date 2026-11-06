// Generates the submission Word document. Run: node docs/build-report.js
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, PageBreak, Footer, PageNumber,
} = require('docx');

const GREEN = '1B6B4A';
const LIGHT = 'E6F5EE';
const STUDENT = 'ST10405518';

// ---------- helpers ----------
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: t, color: GREEN, bold: true })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: t, color: '0F3D2E', bold: true })] });
const p = (t) => new Paragraph({ spacing: { after: 120, line: 300 }, children: [new TextRun(t)] });
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// Monospace code block rendered as a shaded single-cell table.
const code = (text) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [new TableRow({
    children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: 'F4F6F5' },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: text.split('\n').map((l) => new Paragraph({ children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18 })] })),
    })],
  })],
});

// Highlighted placeholder where the student pastes a portal screenshot.
const shot = (caption) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [new TableRow({
    height: { value: 2600, rule: 'atLeast' },
    children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: LIGHT },
      verticalAlign: 'center',
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'INSERT SCREENSHOT', bold: true, color: GREEN })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: caption, italics: true })] }),
      ],
    })],
  })],
});

const cell = (t, opts = {}) => new TableCell({
  shading: opts.head ? { type: ShadingType.CLEAR, fill: GREEN } : undefined,
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  children: [new Paragraph({ children: [new TextRun({ text: t, bold: !!opts.head, color: opts.head ? 'FFFFFF' : undefined, size: 20 })] })],
});
const table = (head, rows) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({ tableHeader: true, children: head.map((t) => cell(t, { head: true })) }),
    ...rows.map((r) => new TableRow({ children: r.map((t) => cell(t)) })),
  ],
});
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });

// ---------- content ----------
const cover = [
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CLDV7112 Practicum', size: 28, color: '666666' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'AgriStream IoT', size: 72, bold: true, color: GREEN })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Building a Real-Time Processing System on Azure', size: 36 })] }),
  new Paragraph({ spacing: { before: 1200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Student number: ${STUDENT}`, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '[Your full name]', size: 26 })] }),
  gap(),
  table(['Submission item', 'Link'], [
    ['Deployed web application', `https://st10405518-web.azurewebsites.net`],
    ['Function App', 'https://st10405518-func.azurewebsites.net'],
    ['Source code repository', 'https://github.com/ST10405518/CLDV7112_Practicum'],
  ]),
  pageBreak(),
];

const intro = [
  h1('1. Introduction and Architecture'),
  p('AgriStream IoT monitors large commercial farms. Soil sensors send telemetry continuously and drones upload high-resolution imagery in bursts. The system must absorb these surges without losing data, so every heavy operation is decoupled from the web tier by storage and queues.'),
  h2('1.1 Architecture overview'),
  table(['Layer', 'Azure service', 'Role'], [
    ['Presentation', 'Azure App Service (ASP.NET Core MVC)', 'Hosts the management web app; stateless so it can scale out (manual scale-out on the Basic tier).'],
    ['Identity and registry', 'Azure SQL Database', 'Users, roles and the master device registry.'],
    ['Unstructured data', 'Azure Blob Storage', 'Drone images (container drone-images).'],
    ['NoSQL data', 'Azure Table Storage', 'Telemetry and image audit tables.'],
    ['Messaging', 'Azure Storage Queue', 'Buffers irrigation commands (irrigation-commands).'],
    ['Compute', 'Azure Functions (4)', 'Blob, HTTP GET, HTTP POST and Queue triggers.'],
    ['Observability', 'Azure Monitor metrics (Application Insights wired in code, blocked by subscription)', 'Plan CPU and memory metrics, function invocations. See section 3.4 for the Application Insights limitation.'],
  ]),
  gap(),
  h2('1.2 Data flows'),
  bullet('Image upload: MVC uploads to Blob Storage, which triggers DroneImageUploaded. The function writes an audit row to the ImageAudit table.'),
  bullet('Dashboard: MVC calls GetTelemetry (HTTP GET). The function reads the newest rows for the field from the Telemetry table.'),
  bullet('Irrigation: MVC calls TriggerIrrigation (HTTP POST). The function validates the request and enqueues a command. ProcessIrrigationCommand dequeues it and sets the device status to Irrigating in Azure SQL.'),
  h2('1.3 Design decisions'),
  bullet('Queue between POST and SQL update: the web request returns immediately (HTTP 202) and bursts of commands are absorbed by the queue instead of overloading SQL.'),
  bullet('Table Storage partitioned by FieldId with a reverse-timestamp RowKey: newest readings come first, so the GET function needs one cheap partition query.'),
  bullet('Output bindings (Table, Queue) replace hand-written client code in two functions, keeping them short and testable.'),
  bullet('Cookie authentication and no in-memory session: any App Service instance can serve any request, which is required for scale-out.'),
  bullet('Passwords are stored as salted PBKDF2 (100,000 iterations, SHA-256) hashes. Self-registration cannot create Admin accounts.'),
  bullet('Queue-trigger retries: a failing message is retried (maxDequeueCount 5) and then moved to the poison queue, so no command is silently lost.'),
  pageBreak(),
];

const build = [
  h1('2. Implementation of Azure Services'),

  h2('2.1 Task (a): Azure App Service'),
  p('The MVC application (AgriStream.Web, .NET 9) is published to an Azure App Service (Linux) on the Basic (B1) tier. This is the only tier family the college subscription policy allows, and it supports manual scale-out only (see section 3.4). Application settings hold the SQL connection string, storage connection string and function key, so no secrets are in source control.'),
  shot('App Service overview page showing the URL, status Running and the App Service plan'),
  gap(),
  shot('The deployed website open in the browser (login page) with the azurewebsites.net URL visible'),

  h2('2.2 Task (b): Azure SQL Database (user management)'),
  p('Two tables are created by Entity Framework on first run. Users stores Username, a PasswordHash and a Role (Farmer, Agronomist or Admin). Devices is the master registry that the queue function updates.'),
  code('public class AppUser\n{\n    public int Id { get; set; }\n    [Required, StringLength(50)]  public string Username { get; set; } = "";\n    [Required]                    public string PasswordHash { get; set; } = "";  // salt:hash (PBKDF2)\n    [Required, StringLength(20)]  public string Role { get; set; } = Roles.Farmer;\n}'),
  gap(),
  p('Role-based access is enforced with [Authorize(Roles = ...)] on controller actions: Farmers and Admins may trigger irrigation, only Admins may generate simulated sensor data, and all roles may view the dashboard.'),
  shot('Azure SQL Database overview and the server firewall rule allowing Azure services'),
  gap(),
  shot('Query editor result of SELECT Id, Username, Role FROM Users (hash column may be hidden)'),
  gap(),
  shot('Query editor result of SELECT * FROM Devices showing device status'),
  gap(),
  shot('MVC login page and the dashboard after successful login (proves the MVC-to-SQL connection)'),

  h2('2.3 Task (c): Azure Blob and Table Storage'),
  p('One storage account provides Blob (container drone-images), Table (Telemetry and ImageAudit) and Queue (irrigation-commands) services. Images are uploaded through the Drone Images page, which only accepts JPEG and PNG files.'),
  code('public async Task UploadImageAsync(IFormFile file)\n{\n    var blobName = $"{DateTime.UtcNow:yyyyMMddHHmmss}-{Path.GetFileName(file.FileName)}";\n    await using var stream = file.OpenReadStream();\n    await _images.GetBlobClient(blobName).UploadAsync(stream,\n        new BlobHttpHeaders { ContentType = file.ContentType });\n}'),
  gap(),
  shot('Storage account overview with the Blob container drone-images containing uploaded images'),
  gap(),
  shot('Storage browser: Telemetry table with sensor rows (PartitionKey = field, RowKey = reverse timestamp)'),
  gap(),
  shot('Drone Images page in the web app after an upload'),

  h2('2.4 Task (d): Serverless data pipeline (four Azure Functions)'),
  table(['#', 'Function', 'Trigger', 'Input / output', 'Purpose'], [
    ['1', 'DroneImageUploaded', 'Blob', 'Table output binding (ImageAudit)', 'Logs upload details and writes an audit entry.'],
    ['2', 'GetTelemetry', 'HTTP GET', 'Reads Telemetry table', 'Returns latest readings for a field.'],
    ['3', 'TriggerIrrigation', 'HTTP POST', 'Queue output binding', 'Validates and enqueues an irrigation command.'],
    ['4', 'ProcessIrrigationCommand', 'Queue', 'Writes to Azure SQL', 'Updates device status in the registry.'],
  ]),
  gap(),
  p('Function 1: blob trigger with a table output binding.'),
  code('[Function("DroneImageUploaded")]\n[TableOutput("ImageAudit", Connection = "StorageConnection")]\npublic TableEntity Run(\n    [BlobTrigger("drone-images/{name}", Connection = "StorageConnection")] byte[] content,\n    string name)\n{\n    _logger.LogInformation("Drone image uploaded: {Name} ({Size} bytes)", name, content.Length);\n    return new TableEntity("ImageAudit", $"{DateTime.UtcNow.Ticks:D19}-{Guid.NewGuid():N}")\n    {\n        { "BlobName", name }, { "SizeBytes", content.Length },\n        { "Status", "Processed" }, { "ProcessedUtc", DateTime.UtcNow }\n    };\n}'),
  gap(),
  p('Function 2: HTTP GET returning the newest readings for a field.'),
  code('[Function("GetTelemetry")]\npublic async Task<IActionResult> Run(\n    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "telemetry")] HttpRequest req)\n{\n    var fieldId = req.Query["fieldId"].ToString();\n    if (string.IsNullOrWhiteSpace(fieldId))\n        return new BadRequestObjectResult("fieldId query parameter is required.");\n    // ... query Telemetry table where PartitionKey == fieldId, newest first\n}'),
  gap(),
  p('Function 3: HTTP POST that places an irrigation command on the queue.'),
  code('[Function("TriggerIrrigation")]\npublic async Task<Result> Run(\n    [HttpTrigger(AuthorizationLevel.Function, "post", Route = "irrigation")] HttpRequest req)\n{\n    // validate DeviceId and DurationMinutes, then:\n    return new Result { QueueMessage = JsonSerializer.Serialize(cmd), Response = new AcceptedResult() };\n}'),
  gap(),
  p('Function 4: queue trigger that updates the device registry in Azure SQL.'),
  code('[Function("ProcessIrrigationCommand")]\npublic async Task Run(\n    [QueueTrigger("irrigation-commands", Connection = "StorageConnection")] string message)\n{\n    var cmd = JsonSerializer.Deserialize<IrrigationCommand>(message, ...);\n    // UPDATE Devices SET Status = \'Irrigating\', LastCommandUtc = SYSUTCDATETIME() WHERE DeviceId = @id\n}'),
  gap(),
  shot('Function App overview listing exactly four functions'),
  gap(),
  shot('Function App > Monitor / Invocations showing successful runs of all four functions'),
  gap(),
  shot('ImageAudit table rows created by the blob-triggered function'),
  gap(),
  shot('Storage queue irrigation-commands (message visible or empty after processing) and Devices table showing status Irrigating'),
  gap(),
  shot('Dashboard in the web app after clicking Trigger Irrigation (success message and updated status)'),
  pageBreak(),
];

const ops = [
  h1('3. Testing, Monitoring and Scaling'),

  h2('3.1 Task (e): Load testing'),
  p('Load was generated with LoadTest/loadtest.ps1, which starts many concurrent users that call the CPU-bound endpoint /Home/Stress?ms=300 on the App Service for a fixed duration and then reports successful requests, failures and requests per second.'),
  code('.\\loadtest.ps1 -BaseUrl https://st10405518-web.azurewebsites.net -Users 50 -Seconds 300'),
  gap(),
  p('Record your results below after running the test.'),
  table(['Metric', '1 instance', '2 instances (manual scale-out)'], [
    ['Concurrent users', '[ ]', '[ ]'],
    ['Requests per second', '[ ]', '[ ]'],
    ['Average response time (ms)', '[ ]', '[ ]'],
    ['Failed requests', '[ ]', '[ ]'],
    ['Instance count', '1', '[ ]'],
    ['Peak CPU %', '[ ]', '[ ]'],
  ]),
  gap(),
  shot('PowerShell output of loadtest.ps1 showing total requests, failures and requests per second'),

  h2('3.2 Task (f): Monitoring'),
  p('Limitation: I could not create an Application Insights resource, so Application Insights Live Metrics and the Performance blade are not available. The Azure subscription is not registered for the Microsoft.Insights resource provider, and I do not have the rights to register it. The full cause and evidence are in section 3.4.'),
  p('What was done instead: the application is already instrumented for Application Insights. AgriStream.Web enables it automatically whenever the APPLICATIONINSIGHTS_CONNECTION_STRING setting contains a value, and AgriStream.Functions references the Application Insights worker packages. Once the provider is registered, setting that one application setting on the two apps turns monitoring on with no code change. For this submission I monitored the system with the built-in Azure Monitor platform metrics, which do not need that provider to be registered by me, and with the App Service log stream.'),
  shot('Proof of limitation: az provider show -n microsoft.insights returning NotRegistered'),
  gap(),
  shot('Proof of limitation: the MissingSubscriptionRegistration error when creating Application Insights'),
  gap(),
  shot('App Service plan Metrics chart: CPU Percentage and Memory Percentage during the test'),
  gap(),
  shot('App Service log stream (az webapp log tail) showing requests and function calls being handled during the test'),
  gap(),
  p('Analysis: [Describe what you observed in the plan metrics, for example CPU during one instance compared with two instances, whether any requests failed, and whether the system met the scalability and reliability goals. State clearly that response-time charts were not available because Application Insights could not be created.]'),

  h2('3.3 Task (g): Auto-scaling'),
  p('Limitation: rule-based auto-scaling could not be enabled on this subscription. Two independent restrictions apply, and both are outside my control (details and evidence in section 3.4):'),
  bullet('Rule-based autoscale needs the Microsoft.Insights resource provider, because autoscale settings are stored as Microsoft.Insights/autoscaleSettings. The provider is NotRegistered, so az monitor autoscale create fails with MissingSubscriptionRegistration.'),
  bullet('Rule-based autoscale needs a Standard (S1) or higher App Service plan. A college Azure Policy denies every SKU except Basic and Shared, so upgrading the plan from B1 to S1 is rejected with RequestDisallowedByPolicy.'),
  p('Intended design: scale out by one instance when average CPU is above 60% for 5 minutes, with a 5 minute cooldown, a minimum of 1 and a maximum of 3 instances, and scale in by one instance when CPU falls below 30%. The commands below are how this would be configured once the restrictions are lifted.'),
  code('az monitor autoscale create -g <rg> --resource plan-agristream --resource-type Microsoft.Web/serverfarms --min-count 1 --max-count 3 --count 1 -n autoscale-agristream\naz monitor autoscale rule create -g <rg> --autoscale-name autoscale-agristream --scale out 1 --condition "CpuPercentage > 60 avg 5m"\naz monitor autoscale rule create -g <rg> --autoscale-name autoscale-agristream --scale in 1 --condition "CpuPercentage < 30 avg 5m"'),
  gap(),
  p('What was demonstrated instead: manual scale-out, which the Basic tier allows. The plan was set to two instances during the load test to show that the application runs correctly on several instances. This works because the application is stateless (section 4.2).'),
  code('az appservice plan update -g <rg> -n plan-agristream --number-of-workers 2'),
  gap(),
  shot('Proof of limitation: MissingSubscriptionRegistration error from az monitor autoscale create'),
  gap(),
  shot('Proof of limitation: RequestDisallowedByPolicy error when upgrading the plan to S1 (policy: App Service Plan should use a SKU that supports Basic and Shared)'),
  gap(),
  shot('Scale out (App Service plan) blade showing manual scale set to 2 instances'),
  gap(),
  shot('App Service plan instance count or metrics during the load test with 2 instances running'),

  h2('3.4 Limitations and evidence'),
  p('Two required tasks could not be completed in full because of restrictions set by the college on the student subscription. They are not configuration mistakes: the errors come from the subscription registration state and from an Azure Policy, as shown by the evidence below.'),
  table(['Requirement', 'What blocked it', 'Evidence', 'What I did instead'], [
    ['Application Insights (task f)', 'Subscription is not registered for the Microsoft.Insights resource provider. Registration by the student fails.', 'az provider show returns NotRegistered. Creating the resource returns MissingSubscriptionRegistration.', 'Application is instrumented in code and ready to switch on. Used Azure Monitor plan metrics and the log stream.'],
    ['Autoscale rules (task g), reason 1', 'Autoscale needs Microsoft.Insights, which is not registered.', 'az monitor autoscale create returns MissingSubscriptionRegistration.', 'Documented the intended rules and commands.'],
    ['Autoscale rules (task g), reason 2', 'Azure Policy denies any plan other than Basic and Shared. Autoscale rules need Standard or higher.', 'az appservice plan update --sku S1 returns RequestDisallowedByPolicy under the policy App Service Plan should use a SKU that supports Basic and Shared (assigned at the subscription and at the Rosebank student management group).', 'Demonstrated manual scale-out to 2 instances on the B1 plan during the load test.'],
  ]),
  gap(),
  p('Request to the assessor: these items are blocked at subscription and management-group level. If the provider is registered and a policy exemption is granted, the commands in section 3.3 and the connection string setting in section 3.2 complete both tasks without any change to the application code.'),
  pageBreak(),
];

const theory = [
  h1('4. Theory Questions'),

  h2('4.1 Disaster recovery and redundancy'),
  p('Azure Storage always keeps multiple copies of data. The redundancy option decides where those copies live.'),
  table(['Aspect', 'LRS (Locally Redundant)', 'GRS (Geo-Redundant)'], [
    ['Copies', 'Three synchronous copies inside one data centre in the primary region.', 'Three copies in the primary region (LRS) plus three asynchronous copies in a paired secondary region, hundreds of kilometres away.'],
    ['Durability', 'At least 99.999999999% (11 nines) over a year.', 'At least 99.99999999999999% (16 nines) over a year.'],
    ['Protects against', 'Disk, server and rack failures.', 'The above plus loss of an entire data centre or region.'],
    ['Does not protect against', 'Fire, flood or outage affecting the whole data centre.', 'Accidental deletion or corruption, which replicates to the secondary copy.'],
    ['Failover', 'None.', 'Microsoft or customer-initiated failover to the secondary region.'],
    ['Cost', 'Lowest.', 'Roughly double the storage cost, plus replication transfer.'],
  ]),
  gap(),
  p('Critical historical crop harvest records: GRS (or RA-GRS if read access to the secondary is needed). These records cannot be recreated if lost. They drive yield analysis, insurance claims and planning across seasons. The higher cost is small compared with the cost of losing years of history, and regional protection supports disaster-recovery requirements.'),
  p('Temporary sensor logs: LRS. This data is high volume, short lived and replaceable because sensors keep producing new readings. Paying for geo-replication on huge volumes of transient data adds cost without matching value, and LRS still protects against hardware failure. If the retention policy deletes it after days or weeks, the reduced durability is an acceptable trade-off.'),
  p('In AgriStream the single storage account holds both telemetry and images, so for production I would split harvest archives into a GRS account and keep the telemetry account on LRS.'),

  h2('4.2 Stateless versus stateful architecture'),
  p('A stateless service keeps no client-specific data between requests. Every request carries, or can fetch from shared storage, everything needed to process it.'),
  p('Why it matters for horizontal scaling: when load grows, Azure adds more instances behind a load balancer and any instance may receive any request. If an instance holds unique state, requests are only correct when they reach that same instance. Stateless instances are interchangeable, so they can be added, removed, restarted or replaced during scale-in, updates or failures without losing user data. Azure Functions go further and scale out and in automatically, and may run on a different host for each invocation.'),
  p('Negative effects of local session data or local files:'),
  bullet('Sticky sessions required: users must be pinned to the instance holding their session, which creates uneven load. One instance can be saturated while new instances sit idle, so scale-out does not help.'),
  bullet('Lost sessions: when an instance is scaled in, restarted or recycled, its in-memory sessions disappear and users are logged out or lose their work.'),
  bullet('Inconsistent data: a file uploaded to instance A is missing on instance B, so users see broken images or errors depending on which instance answers.'),
  bullet('Data loss and weak reliability: local disk is temporary and not shared, so a failed instance takes its data with it.'),
  bullet('Slow scale-out: a new instance starts empty and cannot share the work of existing state, so extra capacity is not usable immediately.'),
  p('How AgriStream stays stateless: login identity is kept in an encrypted cookie rather than server memory. Images go to Blob Storage rather than the web server disk. Telemetry and audits go to Table Storage, commands go through a Storage Queue, and user and device data live in Azure SQL. Any App Service instance or function host can therefore handle any request, which is what allowed the plan to scale out under load.'),

  h2('4.3 Serverless triggers and bindings'),
  table(['', 'Triggers', 'Input / Output bindings'], [
    ['Definition', 'The event that causes a function to run. A function has exactly one trigger, and it can pass the event data as a parameter.', 'A declarative connection to another Azure resource. Input bindings read data into the function. Output bindings write data out of it. A function can have zero or many.'],
    ['Purpose', 'Start execution in response to an event such as a new blob, an HTTP request, a queue message or a timer.', 'Read from or write to services without writing connection and SDK boilerplate, keeping the function code short and focused.'],
    ['Example in AgriStream: Blob function', 'BlobTrigger on drone-images/{name} starts DroneImageUploaded when an image is uploaded.', 'TableOutput("ImageAudit") writes the audit row from the returned TableEntity.'],
    ['Example in AgriStream: HTTP functions', 'HttpTrigger (GET) starts GetTelemetry when the dashboard opens. HttpTrigger (POST) starts TriggerIrrigation when a user clicks Trigger Irrigation.', 'QueueOutput("irrigation-commands") places the irrigation command on the queue from the POST function.'],
    ['Example in AgriStream: Queue function', 'QueueTrigger on irrigation-commands starts ProcessIrrigationCommand for each queued message.', 'No binding is used for the SQL update. It uses SqlClient directly, since Azure SQL is not accessed through a binding in this project.'],
  ]),
  gap(),
  p('In short, triggers answer "what starts the function?" and bindings answer "what data does it read or write while running?".'),
  pageBreak(),
];

const conclusion = [
  h1('5. Conclusion'),
  p('AgriStream IoT implements a decoupled, scalable pipeline. The App Service handles interactive traffic and scales out on CPU. Blob and Table Storage hold unstructured and non-relational data. Four Azure Functions ingest, route and process events, and a Storage Queue absorbs command bursts so no irrigation command is lost. Application Insights and Azure Monitor provided evidence of behaviour during the load test, and autoscale rules added capacity when CPU rose.'),
  h1('6. Submission Details'),
  table(['Item', 'Value'], [
    ['Deployed URL', `https://st10405518-web.azurewebsites.net`],
    ['Source code', '[paste repository link]'],
    ['Demo login', 'Create a Farmer account via Register, or use the seeded Admin account supplied separately.'],
  ]),
];

const doc = new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{
    footers: {
      default: new Footer({
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${STUDENT} - CLDV7112 Practicum - Page `, size: 18 }), new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })],
      }),
    },
    children: [...cover, ...intro, ...build, ...ops, ...theory, ...conclusion],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = `${STUDENT}_CLDV7112_Practicum.docx`;
  fs.writeFileSync(out, buf);
  console.log('Wrote', out);
});

