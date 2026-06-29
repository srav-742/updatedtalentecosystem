# Hire1Percent Platform - Microservices Startup Script
# Starts downstream services in separate PowerShell windows for the API Gateway.

$services = @(
    @{ Name = "Job Service"; Path = "services/job-service" },
    @{ Name = "Candidate Service"; Path = "services/candidate-service" },
    @{ Name = "Recruiter Service"; Path = "services/recruiter-service" },
    @{ Name = "Admin Service"; Path = "services/admin-service" },
    @{ Name = "Assessment Service"; Path = "services/assessment-service" },
    @{ Name = "Interview Service"; Path = "services/interview-service" },
    @{ Name = "Resume Service"; Path = "services/resume-service" },
    @{ Name = "Notification Service"; Path = "services/notification-service" }
)

Write-Host "Starting Hire1Percent Microservices..." -ForegroundColor Cyan

foreach ($service in $services) {
    Write-Host "Launching $($service.Name) in a new window..." -ForegroundColor Green

    $portPrefix = if ($service.Port) { "`$env:PORT = '$($service.Port)'; " } else { "" }
    $command = "`$host.ui.RawUI.WindowTitle = '$($service.Name)'; cd '$($service.Path)'; $portPrefix npm run dev"

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command
}

Write-Host "All microservices launched! Please check the individual windows." -ForegroundColor Yellow