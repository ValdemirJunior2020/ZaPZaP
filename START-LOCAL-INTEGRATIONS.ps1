# One-click LOCAL Nexus AI stack: tests, WA-AKG, Ollama, WhatsApp bridge and Nexus.
# Do not deploy or change production. Never delete database volumes.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$host.UI.RawUI.WindowTitle = "Nexus AI - Local Stack"

function PortUp([int]$port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $task = $client.ConnectAsync("127.0.0.1", $port)
    if (-not $task.Wait(1200)) { return $false }
    return $client.Connected
  } catch { return $false } finally { $client.Dispose() }
}

function StartWindow([string]$title, [string]$command) {
  $script = 'title ' + $title + ' && cd /d "' + $PSScriptRoot + '" && ' + $command
  Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $script) -WorkingDirectory $PSScriptRoot | Out-Null
}

Write-Host "NEXUS AI | ONE-CLICK LOCAL LAUNCHER" -ForegroundColor Cyan
Write-Host "No Netlify deploy, production changes, or Docker volume removal."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22+ is required." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is required." }
Write-Host "[1/5] Checking existing Nexus code..." -ForegroundColor Cyan
node --version
npm run test:ci
if ($LASTEXITCODE -ne 0) { throw "Tests failed. Nothing else was started. Please share the first failing test." }

Write-Host "[2/5] Checking local WA-AKG Docker gateway..." -ForegroundColor Cyan
if (PortUp 3790) {
  Write-Host "WA-AKG already running on 3790; preserving the connected session." -ForegroundColor Green
} else {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker not installed. Start Docker Desktop first." }
  & docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Docker Desktop is not running. Open Docker Desktop and double-click this BAT again." }
  $compose = Join-Path $PSScriptRoot "wa-akg-local\docker-compose.nexus-local.yml"
  if (-not (Test-Path $compose)) { throw "WA-AKG not installed. Run INSTALL-WA-AKG-LOCAL.bat once first." }
  Push-Location (Join-Path $PSScriptRoot "wa-akg-local")
  try {
    & docker compose -f "docker-compose.nexus-local.yml" up -d --no-build --no-recreate db_nexus app
    if ($LASTEXITCODE -ne 0) { throw "WA-AKG could not start. Check Docker logs; no volumes were deleted." }
  } finally { Pop-Location }
  $ready=$false
  for($n=0;$n -lt 15;$n++){if(PortUp 3790){$ready=$true;break};Start-Sleep -Seconds 1}
  if(-not $ready){throw "WA-AKG port 3790 is not ready. Inspect app logs; no changes to data."}
  Write-Host "WA-AKG gateway started." -ForegroundColor Green
}

Write-Host "[3/5] Checking local Ollama..." -ForegroundColor Cyan
if (PortUp 11434) {
  Write-Host "Ollama already running on 11434." -ForegroundColor Green
} else {
  if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    throw "Ollama is not running and the ollama command is unavailable. Start Ollama, then run this BAT."
  }
  StartWindow "Nexus Ollama Local" "ollama serve"
  Write-Host "Ollama start requested. The Ollama window must remain open."
}

Write-Host "[4/5] Checking WhatsApp connector..." -ForegroundColor Cyan
if (PortUp 8791) {
  Write-Host "WhatsApp bridge already running on 8791; reusing it." -ForegroundColor Green
} else {
  if (-not (Test-Path ".env.wa-local")) {
    Copy-Item ".env.wa-local.example" ".env.wa-local"
    Write-Warning "Created .env.wa-local. Set your private API key, existing session ID and TEST sender number before enabling replies."
  }
  $waEnv=[System.IO.File]::ReadAllText((Join-Path $PSScriptRoot ".env.wa-local"))
  if ($waEnv -notmatch '(?m)^NEXUS_WA_SESSION_ID=[a-zA-Z0-9_-]{3,80}\s*$') {
    Write-Warning "Existing WhatsApp session ID not configured in .env.wa-local. Do not create a second session by accident."
  }
  StartWindow "Nexus WhatsApp Local Bridge" "call START-WHATSAPP-LOCAL-TEST.bat"
  Write-Host "WhatsApp bridge start requested. Replies remain OFF by default." -ForegroundColor Green
}

Write-Host "[5/5] Starting Nexus AI dashboard..." -ForegroundColor Cyan
if (PortUp 8788) {
  Write-Host "Nexus already running on http://127.0.0.1:8788" -ForegroundColor Green
  Start-Process "http://127.0.0.1:8788" | Out-Null
  Write-Host "All local services checked. Leave your running terminal windows open."
  exit 0
}
if (-not (Test-Path ".env.local")) { Write-Warning "No .env.local found. Nexus login may be unavailable." }
Write-Host "Nexus dashboard: http://127.0.0.1:8788" -ForegroundColor Green
Write-Host "WA-AKG: 3790 | WhatsApp bridge: 8791 | Ollama: 11434" -ForegroundColor Green
Start-Process "http://127.0.0.1:8788" | Out-Null
npm start
if ($LASTEXITCODE -ne 0) { throw "Nexus local server stopped with an error." }
