Write-Host "Starting StoryGen-Atelier Backend..." -ForegroundColor Green
$backendPath = Join-Path $PSScriptRoot "backend"
$backendScript = Join-Path $backendPath "src\app.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; node '$backendScript'"

Write-Host "Starting StoryGen-Atelier Frontend..." -ForegroundColor Green
$frontendPath = Join-Path $PSScriptRoot "frontend"
$viteScript = Join-Path $frontendPath "node_modules\vite\bin\vite.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; node '$viteScript'"

Write-Host "Servers started in separate windows." -ForegroundColor Cyan
