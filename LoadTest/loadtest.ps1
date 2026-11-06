# Simple concurrent load generator for the App Service.
# Usage: .\loadtest.ps1 -BaseUrl https://<app>.azurewebsites.net -Users 50 -Seconds 300
param(
    [Parameter(Mandatory)] [string] $BaseUrl,
    [int] $Users = 50,
    [int] $Seconds = 300,
    [int] $StressMs = 300
)

$end = (Get-Date).AddSeconds($Seconds)

# One runspace-backed job per simulated user; each loops until the deadline.
$jobs = 1..$Users | ForEach-Object {
    Start-ThreadJob -ArgumentList $BaseUrl, $end, $StressMs {
        param($url, $end, $ms)
        $ok = 0; $fail = 0
        while ((Get-Date) -lt $end) {
            try {
                Invoke-WebRequest "$url/Home/Stress?ms=$ms" -UseBasicParsing -TimeoutSec 30 | Out-Null
                $ok++
            } catch { $fail++ }
        }
        [pscustomobject]@{ Ok = $ok; Failed = $fail }
    }
}

$results = $jobs | Receive-Job -Wait -AutoRemoveJob
$totalOk = ($results | Measure-Object Ok -Sum).Sum
$totalFail = ($results | Measure-Object Failed -Sum).Sum
"Users: $Users  Duration: ${Seconds}s  Success: $totalOk  Failed: $totalFail  Req/s: $([math]::Round($totalOk / $Seconds, 1))"
