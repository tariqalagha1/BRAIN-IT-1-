# ============================================
# Brain it Platform - Production Startup Script (Windows)
# ============================================

Write-Host "🚀 Brain it Platform - Starting..." -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
$dockerCompose = Get-Command docker-compose -ErrorAction SilentlyContinue
if (-not $dockerCompose) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Load environment variables from .env if it exists
if (Test-Path ".env") {
    $envContent = Get-Content ".env" | Where-Object { $_ -notmatch "^#" -and $_ -notmatch "^$" }
    foreach ($line in $envContent) {
        $key, $value = $line -split "=", 2
        if ($key -and $value) {
            [Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), "Process")
        }
    }
    Write-Host "✓ Loaded environment configuration from .env" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found. Using defaults from docker-compose.yml" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Building Docker images..." -ForegroundColor Green
docker-compose build

Write-Host ""
Write-Host "🔄 Starting services..." -ForegroundColor Green
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Green

# Wait for PostgreSQL
Write-Host -NoNewline "  Waiting for PostgreSQL... "
$maxAttempts = 30
$attempt = 0
$pgHealthy = $false
while ($attempt -lt $maxAttempts) {
    try {
        docker-compose exec -T postgres pg_isready -U brainit_user > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pgHealthy = $true
            break
        }
    } catch { }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
    $attempt++
}

if ($pgHealthy) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL failed to start" -ForegroundColor Red
    exit 1
}

# Wait for Core API
Write-Host -NoNewline "  Waiting for Brain it Core... "
$attempt = 0
$coreHealthy = $false
while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $coreHealthy = $true
            break
        }
    } catch { }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
    $attempt++
}

if ($coreHealthy) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host "❌ Brain it Core failed to start" -ForegroundColor Red
    exit 1
}

# Wait for Echo Agent
Write-Host -NoNewline "  Waiting for Echo Agent... "
$attempt = 0
$echoHealthy = $false
while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $echoHealthy = $true
            break
        }
    } catch { }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
    $attempt++
}

if ($echoHealthy) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host "❌ Echo Agent failed to start" -ForegroundColor Red
    exit 1
}

# Wait for Transform Agent
Write-Host -NoNewline "  Waiting for Transform Agent... "
$attempt = 0
$transformHealthy = $false
while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8002/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $transformHealthy = $true
            break
        }
    } catch { }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
    $attempt++
}

if ($transformHealthy) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host "❌ Transform Agent failed to start" -ForegroundColor Red
    exit 1
}

# Wait for Frontend
Write-Host -NoNewline "  Waiting for Frontend... "
$attempt = 0
$frontendHealthy = $false
while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $frontendHealthy = $true
            break
        }
    } catch { }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
    $attempt++
}

if ($frontendHealthy) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend failed to start" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ All services are healthy!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Service URLs:" -ForegroundColor Green
Write-Host "   Frontend:        http://localhost:3000"
Write-Host "   Brain it Core:   http://localhost:8000"
Write-Host "   Echo Agent:      http://localhost:8001"
Write-Host "   Transform Agent: http://localhost:8002"
Write-Host "   PostgreSQL:      localhost:5432"
Write-Host ""
Write-Host "🛑 To stop all services, run: docker-compose down"
Write-Host "📊 To view logs, run: docker-compose logs -f [service-name]"
Write-Host ""
