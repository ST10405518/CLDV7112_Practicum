# Concurrent load generator for the App Service.
# Keeps $Users HTTP requests in flight at all times against the CPU-bound /Home/Stress endpoint.
# Usage: .\loadtest.ps1 -BaseUrl https://<app>.azurewebsites.net -Users 50 -Seconds 300
# Works on Windows PowerShell 5.1 and PowerShell 7+ (no external modules required).
param(
    [Parameter(Mandatory)] [string] $BaseUrl,
    [int] $Users = 50,
    [int] $Seconds = 300,
    [int] $StressMs = 300
)

Add-Type -AssemblyName System.Net.Http

$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(30)

$end   = (Get-Date).AddSeconds($Seconds)
$ok    = 0
$fail  = 0
$tasks = New-Object System.Collections.ArrayList

Write-Host "Load test started: $Users concurrent users for $Seconds seconds against $BaseUrl"

while ((Get-Date) -lt $end) {
    # Top up to $Users requests in flight.
    while ($tasks.Count -lt $Users -and (Get-Date) -lt $end) {
        [void]$tasks.Add($client.GetStringAsync("$BaseUrl/Home/Stress?ms=$StressMs"))
    }
    # Collect completed requests.
    for ($i = $tasks.Count - 1; $i -ge 0; $i--) {
        if ($tasks[$i].IsCompleted) {
            if ($tasks[$i].Status -eq 'RanToCompletion') { $ok++ } else { $fail++ }
            $tasks.RemoveAt($i)
        }
    }
    Start-Sleep -Milliseconds 10
}

# Drain requests still in flight when the timer expired.
foreach ($t in $tasks) {
    try {
        $t.Wait()
        if ($t.Status -eq 'RanToCompletion') { $ok++ } else { $fail++ }
    } catch { $fail++ }
}
$client.Dispose()

$total = $ok + $fail
""
"Users: $Users  Duration: ${Seconds}s  Total: $total  Success: $ok  Failed: $fail  Req/s: $([math]::Round($ok / $Seconds, 1))"
