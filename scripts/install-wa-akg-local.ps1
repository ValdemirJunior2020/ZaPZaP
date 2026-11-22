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
$malformed = ($oldEnv -match '(?m)^MYSQL_ROOT_PASSWORD=.*\s+MYSQL_DATABASE=') -or
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
  Write-Host ('Password: ' + $adminPassword)
  Write-Host 'Save the administrator password privately. It is also stored in wa-akg-local\.env.'
}
# Fix upstream WA-AKG Dockerfile for pinned Prisma 5 CLI.
# Upstream sets NODE_ENV=production in the builder, so npm skips Prisma (devDependency)
# and npx downloads an incompatible latest Prisma CLI. Keep Prisma 5 during build and runtime.
# This patch runs ONLY against the ignored LOCAL WA-AKG clone; never edits GitHub upstream.
$dockerfile = Join-Path $destination 'Dockerfile'
if (-not (Test-Path $dockerfile)) { Fail 'WA-AKG Dockerfile is missing. Reclone only if needed.' }
$dockerContent = [System.IO.File]::ReadAllText($dockerfile)
$replacements = @(
  @('ENV NODE_ENV=production' + "`n" + '# Provide fallback build-time', 'ENV NODE_ENV=development' + "`n" + '# Provide fallback build-time'),
  @('RUN npm ci --legacy-peer-deps && npm cache clean --force', 'RUN npm ci --include=dev --legacy-peer-deps && npm cache clean --force'),
  @('RUN npx prisma generate && npm run build', 'RUN npx --no-install prisma generate && npm run build')
)
foreach ($pair in $replacements) {
  $from = $pair[0]; $to = $pair[1]
  if ($dockerContent.Contains($to)) { continue }
  if (-not $dockerContent.Contains($from)) { Fail ('WA-AKG Dockerfile layout changed: missing ' + $from) }
  $dockerContent = $dockerContent.Replace($from, $to)
}
# For this LOCAL test, retain the Prisma 5 CLI from the successful builder install.
# npm prune --omit=dev removed Prisma at runtime and npx attempted Prisma 8.
# A larger local image is preferable to a broken runtime or a surprise CLI upgrade.
$runtimeOriginal = 'RUN npm prune --omit=dev && npm install --no-save tsx typescript'
$runtimePatched = 'RUN npm prune --omit=dev && npm install --no-save --legacy-peer-deps prisma@5.22.0 tsx typescript'
$runtimeKeep = 'RUN test -x node_modules/.bin/prisma && node_modules/.bin/prisma --version'
if ($dockerContent.Contains($runtimePatched)) {
  $dockerContent = $dockerContent.Replace($runtimePatched, $runtimeKeep)
} elseif ($dockerContent.Contains($runtimeOriginal)) {
  $dockerContent = $dockerContent.Replace($runtimeOriginal, $runtimeKeep)
} elseif (-not $dockerContent.Contains($runtimeKeep)) {
  Fail 'Could not identify WA-AKG runtime dependency command. Existing files were preserved.'
}
$cmdOriginal = 'CMD ["sh", "-c", "npx prisma db push &&'
$cmdNpx = 'CMD ["sh", "-c", "npx --no-install prisma db push &&'
$cmdDirect = 'CMD ["sh", "-c", "./node_modules/.bin/prisma db push &&'
if ($dockerContent.Contains($cmdOriginal)) {
  $dockerContent = $dockerContent.Replace($cmdOriginal, $cmdDirect)
} elseif ($dockerContent.Contains($cmdNpx)) {
  $dockerContent = $dockerContent.Replace($cmdNpx, $cmdDirect)
} elseif (-not $dockerContent.Contains($cmdDirect)) {
  Fail 'Could not identify WA-AKG Prisma startup command. Existing files were preserved.'
}
[System.IO.File]::WriteAllText($dockerfile, $dockerContent, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Applied local-only pinned Prisma 5 Docker build fix.'
# MySQL root may only authenticate via its local socket; never enable remote root.
# Provision an app-specific user without deleting or resetting existing MySQL data.
$envText = [System.IO.File]::ReadAllText($envPath)
$passwordMatch = [regex]::Match($envText, '(?m)^NEXUS_WA_DB_PASSWORD=([A-Za-z0-9]+)[ \t]*$')
if ($passwordMatch.Success) {
  $appDbPassword = $passwordMatch.Groups[1].Value
} else {
  $appDbPassword = NewSecret 24
  $envText = $envText.TrimEnd([char[]]"`r`n") + "`r`nNEXUS_WA_DB_PASSWORD=" + $appDbPassword + "`r`n"
  [System.IO.File]::WriteAllText($envPath, $envText, [System.Text.UTF8Encoding]::new($false))
}
if ($appDbPassword -notmatch '^[A-Za-z0-9]{20,100}$') {
  Fail 'Invalid local DB password format. Existing MySQL data was preserved.'
}
$tick = [char]96
$dbSetupSql = @(
  ('CREATE DATABASE IF NOT EXISTS ' + $tick + 'wa_akg' + $tick + ';')
  ("CREATE USER IF NOT EXISTS 'nexus_wa'@'%' IDENTIFIED BY '" + $appDbPassword + "';")
  ("ALTER USER 'nexus_wa'@'%' IDENTIFIED BY '" + $appDbPassword + "';")
  ('GRANT ALL PRIVILEGES ON ' + $tick + 'wa_akg' + $tick + ".* TO 'nexus_wa'@'%';")
)
Write-Host 'Configuring local WA-AKG MySQL user (no data removed)...'
$dbSetupSql | & docker exec -i wa-akg-local-db-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql --protocol=socket -uroot'
if ($LASTEXITCODE -ne 0) {
  Fail 'Cannot administer the existing local MySQL container. Data preserved; do not delete Docker volumes.'
}
Write-Host 'Dedicated WA-AKG database user configured.'
# Compose has its own file so the upstream exposed 0.0.0.0:3000 port cannot leak.
$localCompose = @'
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-wa_akg}
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "127.0.0.1:3790:3000"
    environment:
      DATABASE_URL: mysql://nexus_wa:${NEXUS_WA_DB_PASSWORD}@db:3306/${MYSQL_DATABASE:-wa_akg}
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
      db:
        condition: service_healthy
    volumes:
      - app_data:/app/data
      - uploads_data:/app/uploads
volumes:
  mysql_data:
  app_data:
  uploads_data:
'@
[System.IO.File]::WriteAllText((Join-Path $destination 'docker-compose.nexus-local.yml'),$localCompose,[System.Text.UTF8Encoding]::new($false))
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
