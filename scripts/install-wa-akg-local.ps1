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
  function NewSecret([int]$length = 28) {
    $bytes = [byte[]]::new($length)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
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
  @('RUN npx prisma generate && npm run build', 'RUN npx --no-install prisma generate && npm run build'),
  @('RUN npm prune --omit=dev && npm install --no-save tsx typescript', 'RUN npm prune --omit=dev && npm install --no-save --legacy-peer-deps prisma@5.22.0 tsx typescript'),
  @('CMD ["sh", "-c", "npx prisma db push &&', 'CMD ["sh", "-c", "npx --no-install prisma db push &&')
)
foreach ($pair in $replacements) {
  $from = $pair[0]; $to = $pair[1]
  if ($dockerContent.Contains($to)) { continue }
  if (-not $dockerContent.Contains($from)) { Fail ('WA-AKG Dockerfile layout changed: missing ' + $from) }
  $dockerContent = $dockerContent.Replace($from, $to)
}
[System.IO.File]::WriteAllText($dockerfile, $dockerContent, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Applied local-only pinned Prisma 5 Docker build fix.'
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
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD}@db:3306/${MYSQL_DATABASE:-wa_akg}
      AUTH_SECRET: ${AUTH_SECRET}
      BASE_URL: http://127.0.0.1:3000
      NEXTAUTH_URL: http://127.0.0.1:3000
      NEXT_PUBLIC_APP_URL: http://127.0.0.1:3000
      NEXT_PUBLIC_API_URL: http://127.0.0.1:3000/api
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
Write-Host 'Building and starting WA-AKG + its private MySQL container locally...'
docker compose -f docker-compose.nexus-local.yml up -d --build
if ($LASTEXITCODE -ne 0) { Fail 'Docker build/start failed. Inspect docker compose -f docker-compose.nexus-local.yml logs.' }
Write-Host 'WA-AKG is starting locally: http://127.0.0.1:3000'
Write-Host 'Open the dashboard, sign in, then Settings -> API Keys; paste its key into the Nexus .env.wa-local file.'
