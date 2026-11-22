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
function NewSecret([int]$length = 28) {
  $bytes = [byte[]]::new($length)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return ([Convert]::ToBase64String($bytes)).TrimEnd('=').Replace('+','A').Replace('/','B')
}
$envPath = Join-Path $destination '.env'
$oldEnv = if (Test-Path $envPath) { [System.IO.File]::ReadAllText($envPath) } else { '' }
# Older installer wrote all keys onto one line, so Docker interpreted them as
# one giant MYSQL_ROOT_PASSWORD. Repair in place WITHOUT deleting the DB volume.
$malformed = ($oldEnv -match '(?m)^MYSQL_ROOT_PASSWORD=[^\r\n]*[ \t]+MYSQL_DATABASE=') -or
             ($oldEnv -and $oldEnv -notmatch '(?m)^AUTH_SECRET=') -or
             ($oldEnv -and $oldEnv -notmatch '(?m)^ADMIN_EMAIL=')
if (-not $oldEnv -or $malformed) {
  $mysql = $null
  # Match the EXACT password used by the already initialized MySQL container.
  # Never print it, and do not change it while preserving the MySQL volume.
  $inspect = & docker inspect --format '{{json .Config.Env}}' wa-akg-local-db-1 2>$null
  if ($LASTEXITCODE -eq 0 -and $inspect) {
    # ConvertFrom-Json outputs array items directly. The previous pipeline
    # unwrapped a string into the wrong shape and caused Substring to fail.
    $prefix = 'MYSQL_ROOT_PASSWORD='
    $jsonText = [string]::Join('', [string[]]@($inspect))
    try {
      $entries = ConvertFrom-Json -InputObject $jsonText
      foreach ($item in @($entries)) {
        $value = [string]$item
        if ($value.StartsWith($prefix, [StringComparison]::Ordinal) -and $value.Length -gt $prefix.Length) {
          $mysql = $value.Substring($prefix.Length)
          break
        }
      }
    } catch {
      Fail 'Docker returned invalid container metadata. Existing MySQL volume was not changed.'
    }
  }
  if (-not $mysql -and $oldEnv) {
    Fail 'Could not recover existing MySQL password safely. Do not delete the DB volume; share only the error text.'
  }
  if (-not $mysql) { $mysql = NewSecret 24 }
  $auth = NewSecret 48
  $adminPassword = NewSecret 24
  $email = 'localadmin@example.test'
  # Each entry must be a distinct array item, not a comma-separated expression.
  # The URL-encoded MySQL password is separate from the raw container password.
  $envLines = @(
    ("MYSQL_ROOT_PASSWORD='" + $mysql.Replace("'", "''") + "'")
    ('NEXUS_WA_MYSQL_PASSWORD_URL=' + [Uri]::EscapeDataString($mysql))
    'MYSQL_DATABASE=wa_akg'
    ('AUTH_SECRET=' + $auth)
    'BASE_URL=http://127.0.0.1:3790'
    'NEXTAUTH_URL=http://127.0.0.1:3790'
    'PORT=3000'
    'DEFAULT_LANGUAGE=en'
    'TZ=America/New_York'
    'ENABLE_TELEMETRY=false'
    ('ADMIN_EMAIL=' + $email)
    ('ADMIN_PASSWORD=' + $adminPassword)
  )
  # Preserve a local-only backup of original settings; never print secrets.
  if ($oldEnv) { [System.IO.File]::WriteAllText(($envPath + '.before-repair'), $oldEnv, [System.Text.UTF8Encoding]::new($false)) }
  [System.IO.File]::WriteAllLines($envPath, [string[]]$envLines, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'WA-AKG environment file created/repaired with separate settings.'
  Write-Host 'LOCAL WA-AKG administrator:'
  Write-Host ('Email: ' + $email)
  Write-Host 'Password: stored privately in wa-akg-local\.env (ADMIN_PASSWORD). Do not share it.'
  Write-Host 'Save the administrator password privately. It is also stored in wa-akg-local\.env.'
}
# Fix upstream WA-AKG Dockerfile for pinned Prisma 5 CLI.
# Upstream sets NODE_ENV=production in the builder, so npm skips Prisma (devDependency)
# and npx downloads an incompatible latest Prisma CLI. Keep Prisma 5 during build and runtime.
# This patch runs ONLY against the ignored LOCAL WA-AKG clone; never edits GitHub upstream.
$dockerfile = Join-Path $destination 'Dockerfile'
if (-not (Test-Path $dockerfile)) { Fail 'WA-AKG Dockerfile is missing. Reclone only if needed.' }
$dockerContent = [System.IO.File]::ReadAllText($dockerfile)
# Idempotent patch: accept upstream, intermediate, or already-fixed local Dockerfile.
# Important: keep original node_modules (including Prisma CLI) in the builder.
$buildPairs = @(
  @('ENV NODE_ENV=production' + "`n" + '# Provide fallback build-time', 'ENV NODE_ENV=development' + "`n" + '# Provide fallback build-time')
  @('RUN npm ci --legacy-peer-deps && npm cache clean --force', 'RUN npm ci --include=dev --legacy-peer-deps && npm cache clean --force')
  @('RUN npx prisma generate && npm run build', 'RUN npx --no-install prisma generate && npm run build')
)
foreach ($pair in $buildPairs) {
  $from = [string]$pair[0]
  $to = [string]$pair[1]
  if ($dockerContent.Contains($to)) { continue }
  if (-not $dockerContent.Contains($from)) { Fail ('Unsupported WA-AKG Dockerfile build stage: ' + $from) }
  $dockerContent = $dockerContent.Replace($from, $to)
}
$runtimeKeep = 'RUN test -x node_modules/.bin/prisma && node_modules/.bin/prisma --version'
$runtimeVariants = @(
  'RUN npm prune --omit=dev && npm install --no-save tsx typescript'
  'RUN npm prune --omit=dev && npm install --no-save --legacy-peer-deps prisma@5.22.0 tsx typescript'
)
if (-not $dockerContent.Contains($runtimeKeep)) {
  $found = $false
  foreach ($variant in $runtimeVariants) {
    if ($dockerContent.Contains($variant)) {
      $dockerContent = $dockerContent.Replace($variant, $runtimeKeep)
      $found = $true
      break
    }
  }
  if (-not $found) { Fail 'Unsupported WA-AKG Dockerfile runtime stage; preserving existing files.' }
}
$cmdDirect = 'CMD ["sh", "-c", "./node_modules/.bin/prisma db push &&'
$cmdVariants = @(
  'CMD ["sh", "-c", "npx prisma db push &&'
  'CMD ["sh", "-c", "npx --no-install prisma db push &&'
)
if (-not $dockerContent.Contains($cmdDirect)) {
  $found = $false
  foreach ($variant in $cmdVariants) {
    if ($dockerContent.Contains($variant)) {
      $dockerContent = $dockerContent.Replace($variant, $cmdDirect)
      $found = $true
      break
    }
  }
  if (-not $found) { Fail 'Unsupported WA-AKG Dockerfile startup command; preserving existing files.' }
}
[System.IO.File]::WriteAllText($dockerfile, $dockerContent, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Applied local-only pinned Prisma 5 Docker build fix.'
# Fresh, ISOLATED local-test MySQL service/volume. Never delete old mysql_data.
# MySQL auto-creates the limited application account on first initialization.
$envText = [System.IO.File]::ReadAllText($envPath)
function EnsureLocalVar([string]$key) {
  $pattern = '(?m)^' + [regex]::Escape($key) + '=([A-Za-z0-9]{20,100})[ \t]*$'
  $match = [regex]::Match($script:envText, $pattern)
  if ($match.Success) { return $match.Groups[1].Value }
  if ($script:envText -match ('(?m)^' + [regex]::Escape($key) + '=')) {
    Fail ('Invalid existing local setting: ' + $key + '. Data preserved.')
  }
  $value = NewSecret 32
  $script:envText = $script:envText.TrimEnd([char[]]"`r`n") + "`r`n" + $key + '=' + $value + "`r`n"
  return $value
}
$null = EnsureLocalVar 'NEXUS_WA_DB_V2_ROOT'
$null = EnsureLocalVar 'NEXUS_WA_DB_V2_USER_PASSWORD'
[System.IO.File]::WriteAllText($envPath, $envText, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Using isolated local MySQL test database; old database volume untouched.'
$localCompose = @'
services:
  db_nexus:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${NEXUS_WA_DB_V2_ROOT}
      MYSQL_DATABASE: wa_akg
      MYSQL_USER: nexus_wa
      MYSQL_PASSWORD: ${NEXUS_WA_DB_V2_USER_PASSWORD}
    volumes:
      - mysql_nexus_isolated_v2:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 15
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:3790:3000"
    environment:
      DATABASE_URL: mysql://nexus_wa:${NEXUS_WA_DB_V2_USER_PASSWORD}@db_nexus:3306/wa_akg
      AUTH_SECRET: ${AUTH_SECRET}
      BASE_URL: http://127.0.0.1:3790
      NEXTAUTH_URL: http://127.0.0.1:3790
      NEXT_PUBLIC_APP_URL: http://127.0.0.1:3790
      NEXT_PUBLIC_API_URL: http://127.0.0.1:3790/api
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: 0.0.0.0
      ENABLE_TELEMETRY: "false"
      DEFAULT_LANGUAGE: en
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      db_nexus:
        condition: service_healthy
    volumes:
      - app_data:/app/data
      - uploads_data:/app/uploads
volumes:
  mysql_nexus_isolated_v2:
  app_data:
  uploads_data:
'@
[System.IO.File]::WriteAllText((Join-Path $destination 'docker-compose.nexus-local.yml'), $localCompose, [System.Text.UTF8Encoding]::new($false))
# Keep an existing local bridge configuration in sync without showing or changing its API key.
$bridgeEnv = Join-Path $root '.env.wa-local'
if (Test-Path $bridgeEnv) {
  $existing = [System.IO.File]::ReadAllText($bridgeEnv)
  $updated = [regex]::Replace($existing, '(?m)^NEXUS_WA_AKG_URL=http://(?:127\.0\.0\.1|localhost):3000[ \t]*$', 'NEXUS_WA_AKG_URL=http://127.0.0.1:3790')
  if ($updated -ne $existing) {
    [System.IO.File]::WriteAllText($bridgeEnv, $updated, [System.Text.UTF8Encoding]::new($false))
    Write-Host 'Updated existing .env.wa-local WA-AKG URL to port 3790. All secrets were preserved.'
  }
}
Write-Host 'Building and starting WA-AKG + its private MySQL container locally...'
docker compose -f docker-compose.nexus-local.yml up -d --build
if ($LASTEXITCODE -ne 0) { Fail 'Docker build/start failed. Inspect docker compose -f docker-compose.nexus-local.yml logs.' }
Write-Host 'WA-AKG is starting locally: http://127.0.0.1:3790'
Write-Host 'Open the dashboard, sign in, then Settings -> API Keys; paste its key into the Nexus .env.wa-local file.'
