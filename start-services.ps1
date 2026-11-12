# Hire1Percent Talent Ecosystem Startup Script
# Starts Backend and Frontend in separate PowerShell windows

$services = @(
    @{ Name = "Talent Ecosystem Backend"; Path = "backend"; Port = "5000" },
    @{ Name = "Talent Ecosystem Frontend"; Path = "frontend" }
)

Write-Host "Starting Talent Ecosystem (Backend & Frontend)..." -ForegroundColor Cyan

foreach ($service in $services) {
    Write-Host "Launching $($service.Name)..." -ForegroundColor Green

    $portPrefix = if ($service.Port) { "`$env:PORT = '$($service.Port)'; " } else { "" }
    $command = "`$host.ui.RawUI.WindowTitle = '$($service.Name)'; cd '$($service.Path)'; $portPrefix npm run dev"

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command
}

Write-Host "Talent Ecosystem services launched successfully!" -ForegroundColor Green
