# Nexus AI local-only integration smoke test and startup.
# Never deploys, merges, writes production credentials, or changes an existing port.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Write-Host "Nexus AI local integration tests" -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 is required." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is required." }
node --version
npm run test:ci
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Local server was not started." }
Write-Host "Tests passed. Starting local Nexus AI on the existing port 8788." -ForegroundColor Green
if (-not (Test-Path ".env.local")) {
 Write-Warning "No .env.local found. Sign-in and Google Calendar connection may be unavailable."
}
npm start
if ($LASTEXITCODE -ne 0) { throw "Local Nexus AI stopped with an error." }
