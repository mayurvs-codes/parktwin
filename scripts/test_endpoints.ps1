$endpoints = @(
    "http://localhost:8000/health",
    "http://localhost:8000/cameras",
    "http://localhost:8000/slots",
    "http://localhost:8000/parking/slots",
    "http://localhost:8000/vehicles",
    "http://localhost:8000/sessions",
    "http://localhost:8000/parking/sessions",
    "http://localhost:8000/events",
    "http://localhost:8000/parking/events",
    "http://localhost:8000/analytics/occupancy",
    "http://localhost:8000/vehicles/VH-001",
    "http://localhost:8000/vehicles/VH-002"
)
foreach ($url in $endpoints) {
    try {
        $resp = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -ErrorAction Stop
        Write-Host "$url -> HTTP $($resp.StatusCode): $($resp.Content.Substring(0, [Math]::Min(120, $resp.Content.Length)))"
    } catch {
        Write-Host "$url -> HTTP $($_.Exception.Response.StatusCode.value__): $($_.Exception.Message)"
    }
}
