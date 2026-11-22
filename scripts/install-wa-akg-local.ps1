# One-time WA-AKG local Docker installer. No remote deployment or paid API.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $root 'wa-akg-local'
function Fail([string]$message) { throw $message }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'Install Git for Windows first.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail 'Docker Desktop not found. Install and start Docker Desktop first (local containers only).' }
docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Start Docker Desktop first, then run this installer again.' }
if (-not (Test-Path $destination)) {
  Write-Host 'Cloning WA-AKG open-source gateway...'
  git clone --depth 1 https://github.com/mrifqidaffaaditya/WA-AKG.git $destination
  if ($LASTEXITCODE -ne 0) { Fail 'Git clone failed.' }
}
Set-Location $destination
if (-not (Test-Path '.env')) {
  Add-Type -AssemblyName System.Security
  function NewSecret([int]$length = 28) {
    $bytes = [byte[]]::new($length)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return ([Convert]::ToBase64String($bytes)).TrimEnd('=').Replace('+','A').Replace('/','B')
  }
  $mysql = NewSecret 24
  $auth = NewSecret 48
  $adminPassword = NewSecret 22
  $email = 'localadmin@example.test'
  $envLines = @(
    'MYSQL_ROOT_PASSWORD=' + $mysql,
    'MYSQL_DATABASE=wa_akg',
    'AUTH_SECRET=' + $auth,
    'BASE_URL=http://127.0.0.1:3000',
    'NEXTAUTH_URL=http://127.0.0.1:3000',
    'PORT=3000',
    'DEFAULT_LANGUAGE=en',
    'TZ=America/New_York',
    'ENABLE_TELEMETRY=false',
    'ADMIN_EMAIL=' + $email,
    'ADMIN_PASSWORD=' + $adminPassword
  )
  [System.IO.File]::WriteAllLines((Join-Path $destination '.env'),$envLines,[System.Text.UTF8Encoding]::new($false))
  Write-Host ''
  Write-Host 'WA-AKG admin account (save privately):'
  Write-Host ('Email: ' + $email)
  Write-Host ('Password: ' + $adminPassword)
  Write-Host 'Admin credentials are stored in wa-akg-local\.env on your PC; DO NOT share or commit it.'
}
# Override exposed port in default upstream compose. Keep WA-AKG on local machine.
$override = @'
services:
  app:
    ports:
      - "127.0.0.1:3000:3000"
'@
[System.IO.File]::WriteAllText((Join-Path $destination 'docker-compose.override.yml'),$override,[System.Text.UTF8Encoding]::new($false))
Write-Host 'Building and starting WA-AKG + its private MySQL container locally...'
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Fail 'Docker build/start failed. Inspect docker compose logs in wa-akg-local.' }
Write-Host 'WA-AKG is starting locally: http://127.0.0.1:3000'
Write-Host 'Open the dashboard, sign in, then Settings -> API Keys; paste its key into the Nexus .env.wa-local file.'
