#!/usr/bin/env pwsh
# ===========================================================================
# ParkTwin AI — Developer Control Script
# ===========================================================================
# Usage:
#   .\dev.ps1 up           → Start backend + frontend (from existing image)
#   .\dev.ps1 backend      → Start backend ONLY (fastest, for API development)
#   .\dev.ps1 stop         → Stop all containers (data is kept)
#   .\dev.ps1 restart      → Stop + start without rebuild
#   .\dev.ps1 build        → Build images for the FIRST TIME (or after dep changes)
#   .\dev.ps1 rebuild      → Force rebuild images (use only after pyproject.toml changes)
#   .\dev.ps1 logs         → Tail backend logs
#   .\dev.ps1 shell        → Open a bash shell inside the running backend container
#   .\dev.ps1 test         → Run pytest inside the running container (no rebuild)
#   .\dev.ps1 test <path>  → Run a specific test file, e.g: .\dev.ps1 test tests/unit/test_calculators.py
#   .\dev.ps1 status       → Show container status + health
#   .\dev.ps1 clean        → Remove containers but KEEP volumes (data safe)
#   .\dev.ps1 wipe         → FULL WIPE: remove containers + volumes (lose all data!)
#   .\dev.ps1 db           → Open SQLite shell on the running database
#   .\dev.ps1 health       → Check /health endpoint
#   .\dev.ps1 help         → Show this help
# ===========================================================================

$COMPOSE_FILE = "docker/compose/docker-compose.hotdev.yml"
$BACKEND_SERVICE = "backend"
$FRONTEND_SERVICE = "frontend"
$BACKEND_CONTAINER = "parktwin-dev"
$API_URL = "http://localhost:8000"

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
function Write-Step($msg) { Write-Host "`n  -> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [ERR] $msg" -ForegroundColor Red }
function Write-Header($msg) {
    Write-Host ""
    Write-Host "  =======================================" -ForegroundColor DarkCyan
    Write-Host "  $msg" -ForegroundColor White
    Write-Host "  =======================================" -ForegroundColor DarkCyan
}

# ---------------------------------------------------------------------------
# Check docker is running
# ---------------------------------------------------------------------------
function Assert-Docker {
    try {
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw }
    } catch {
        Write-Err "Docker is not running. Start Docker Desktop first."
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Check if image exists
# ---------------------------------------------------------------------------
function Test-ImageExists($image) {
    $result = docker image ls $image --format "{{.Repository}}" 2>&1
    return ($result -ne "" -and $result -ne $null)
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

function Invoke-Build {
    Write-Header "Building ParkTwin AI images (FIRST TIME SETUP)"
    Write-Warn "This will take 15-40 minutes the first time (downloading ML weights)."
    Write-Warn "After this, 'dev.ps1 up' starts in seconds."
    Write-Host ""
    # Build backend from the main Dockerfile
    docker build -t parktwin-ai/backend:dev -f docker/backend/Dockerfile --build-arg APP_UID=1000 --build-arg APP_GID=1000 .
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Backend image built. Run '.\dev.ps1 up' to start."
    } else {
        Write-Err "Build failed. Check the error above."
    }
}

function Invoke-Rebuild {
    Write-Header "Force Rebuilding images"
    Write-Warn "Use this ONLY if you changed pyproject.toml or Dockerfile."
    Write-Warn "Normal code changes don't need a rebuild (they hot-reload automatically)."
    Write-Host ""
    docker compose -f $COMPOSE_FILE build --no-cache
}

function Invoke-Up($backendOnly = $false) {
    Assert-Docker

    # Check if image exists; if not, offer to build
    if (-not (Test-ImageExists "parktwin-ai/backend:dev")) {
        Write-Warn "Backend image not found. Running first-time build..."
        Write-Warn "(This takes 15-40 minutes once, then is instant.)"
        Invoke-Build
    }

    if ($backendOnly) {
        Write-Header "Starting Backend only"
        Write-Step "Starting backend container..."
        docker compose -f $COMPOSE_FILE up -d $BACKEND_SERVICE
    } else {
        Write-Header "Starting ParkTwin AI (Backend + Frontend)"
        Write-Step "Starting all services..."
        docker compose -f $COMPOSE_FILE up -d
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Ok "Services started!"
        Write-Host ""
        Write-Host "  Backend API:  $API_URL" -ForegroundColor White
        Write-Host "  API Docs:     $API_URL/docs" -ForegroundColor White
        if (-not $backendOnly) {
            Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor White
        }
        Write-Host "  Live logs:    .\dev.ps1 logs" -ForegroundColor DarkGray
        Write-Host "  Run tests:    .\dev.ps1 test" -ForegroundColor DarkGray
        Write-Host "  Stop:         .\dev.ps1 stop" -ForegroundColor DarkGray
        Write-Host ""

        # Wait for health check
        Write-Step "Waiting for backend to be ready..."
        $retries = 0
        do {
            Start-Sleep -Seconds 3
            try {
                $response = Invoke-WebRequest -Uri "$API_URL/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Ok "Backend is healthy and ready!"
                    break
                }
            } catch {}
            $retries++
            Write-Host "  Waiting... ($retries/15)" -ForegroundColor DarkGray
        } while ($retries -lt 15)

        if ($retries -ge 15) {
            Write-Warn "Backend is taking longer than expected."
            Write-Warn "Check logs with: .\dev.ps1 logs"
        }
    } else {
        Write-Err "Failed to start services."
    }
}

function Invoke-Stop {
    Write-Header "Stopping ParkTwin AI (data is preserved)"
    docker compose -f $COMPOSE_FILE stop
    Write-Ok "Stopped. Your database, models, and logs are all kept."
    Write-Ok "Run '.\dev.ps1 up' to start again (instant)."
}

function Invoke-Restart {
    Write-Header "Restarting ParkTwin AI"
    docker compose -f $COMPOSE_FILE stop
    Start-Sleep -Seconds 2
    Invoke-Up
}

function Invoke-Logs {
    Write-Header "Backend logs (Ctrl+C to exit)"
    docker compose -f $COMPOSE_FILE logs -f $BACKEND_SERVICE
}

function Invoke-Shell {
    Write-Header "Opening shell inside backend container"
    Write-Step "Type 'exit' to return to PowerShell"
    Write-Host ""
    docker exec -it $BACKEND_CONTAINER bash
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "bash not available, trying sh..."
        docker exec -it $BACKEND_CONTAINER sh
    }
}

function Invoke-Test($testPath = "") {
    Write-Header "Running pytest"

    # Check if container is running
    $running = docker ps --filter "name=$BACKEND_CONTAINER" --format "{{.Names}}" 2>&1
    if ($running -ne $BACKEND_CONTAINER) {
        Write-Warn "Backend container is not running. Starting it first..."
        Invoke-Up $true
        Start-Sleep -Seconds 5
    }

    if ($testPath -ne "") {
        Write-Step "Running: pytest $testPath"
        docker exec $BACKEND_CONTAINER python -m pytest $testPath -v --tb=short
    } else {
        Write-Step "Running: pytest tests/ (full suite)"
        docker exec $BACKEND_CONTAINER python -m pytest tests/ -q --tb=short
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "All tests passed!"
    } else {
        Write-Err "Some tests failed. See output above."
    }
}

function Invoke-Status {
    Write-Header "Container Status"
    docker compose -f $COMPOSE_FILE ps
    Write-Host ""
    Write-Header "Volume Status (persistent data)"
    docker volume ls --filter "name=parktwin_"
}

function Invoke-Clean {
    Write-Header "Removing containers (volumes/data are KEPT)"
    docker compose -f $COMPOSE_FILE down
    Write-Ok "Containers removed. All data (models, database, logs) is preserved in volumes."
    Write-Ok "Run '.\dev.ps1 up' to start fresh containers with existing data (instant)."
}

function Invoke-Wipe {
    Write-Header "FULL WIPE WARNING"
    Write-Err "This will DELETE all containers AND volumes."
    Write-Err "You will LOSE: database, downloaded models, PaddleOCR cache, logs."
    Write-Err "Next startup will re-download everything (15-40 minutes)."
    Write-Host ""
    $confirm = Read-Host "  Type 'WIPE' to confirm, anything else to cancel"
    if ($confirm -eq "WIPE") {
        docker compose -f $COMPOSE_FILE down -v
        Write-Warn "Wiped. Run '.\dev.ps1 build' to rebuild from scratch."
    } else {
        Write-Ok "Cancelled. Nothing was deleted."
    }
}

function Invoke-Db {
    Write-Header "Opening SQLite database shell"
    Write-Step "Connected to parktwin.db inside the named volume"
    Write-Host "  Type '.tables' to list tables, '.quit' to exit" -ForegroundColor DarkGray
    Write-Host ""

    $running = docker ps --filter "name=$BACKEND_CONTAINER" --format "{{.Names}}" 2>&1
    if ($running -ne $BACKEND_CONTAINER) {
        Write-Warn "Backend not running. Starting it first..."
        Invoke-Up $true
        Start-Sleep -Seconds 8
    }
    docker exec -it $BACKEND_CONTAINER sqlite3 /app/data/parktwin.db
}

function Invoke-Health {
    Write-Header "Health Check"
    try {
        $h = Invoke-RestMethod -Uri "$API_URL/health" -TimeoutSec 5
        Write-Ok "Backend: $($h.status)"
    } catch {
        Write-Err "Backend not responding at $API_URL"
    }
    try {
        $db = Invoke-RestMethod -Uri "$API_URL/health/db" -TimeoutSec 5
        Write-Ok "Database: $($db.status)"
    } catch {
        Write-Warn "Could not reach /health/db"
    }
    try {
        $ig = Invoke-RestMethod -Uri "$API_URL/integration/health" -TimeoutSec 5
        Write-Ok "Integration: $($ig.status)"
    } catch {
        Write-Warn "Could not reach /integration/health"
    }
}

function Invoke-Help {
    Write-Header "ParkTwin AI Developer Script"
    Write-Host @"

  DAILY USE (these are fast — no rebuild):
  -----------------------------------------
  .\dev.ps1 backend      Start backend only (API dev, testing)
  .\dev.ps1 up           Start backend + frontend
  .\dev.ps1 stop         Stop everything (data is safe)
  .\dev.ps1 restart      Stop + start again
  .\dev.ps1 logs         Tail live backend logs
  .\dev.ps1 test         Run full test suite (201 tests)
  .\dev.ps1 test tests/unit/test_calculators.py  Run specific test
  .\dev.ps1 shell        Open bash inside the container
  .\dev.ps1 db           Open SQLite shell on the live database
  .\dev.ps1 health       Check /health endpoints
  .\dev.ps1 status       Show container + volume status

  SETUP (run once, or after changing pyproject.toml):
  ----------------------------------------------------
  .\dev.ps1 build        First-time image build (15-40 min, once only)
  .\dev.ps1 rebuild      Force rebuild (only if you added Python deps)

  CLEANUP:
  --------
  .\dev.ps1 clean        Remove containers (keep all data in volumes)
  .\dev.ps1 wipe         FULL WIPE - destroys everything including models/db

  HOW IT WORKS:
  -------------
  * Code is bind-mounted: edits to backend/, modules/, engine/, shared/ 
    reflect instantly in the container (uvicorn --reload handles it).
  * ML models are in a named volume (parktwin_models) - downloaded ONCE.
  * PaddleOCR/EasyOCR/Ultralytics caches are also named volumes - never re-downloaded.
  * SQLite database is in a named volume (parktwin_db) - data persists.
  * 'stop' only pauses containers. All data stays. 'up' resumes in seconds.

"@ -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Entry point — dispatch based on first argument
# ---------------------------------------------------------------------------
$command = $args[0]
$param   = $args[1]

switch ($command) {
    "up"        { Invoke-Up $false }
    "backend"   { Invoke-Up $true }
    "stop"      { Invoke-Stop }
    "restart"   { Invoke-Restart }
    "build"     { Invoke-Build }
    "rebuild"   { Invoke-Rebuild }
    "logs"      { Invoke-Logs }
    "shell"     { Invoke-Shell }
    "test"      { Invoke-Test $param }
    "status"    { Invoke-Status }
    "clean"     { Invoke-Clean }
    "wipe"      { Invoke-Wipe }
    "db"        { Invoke-Db }
    "health"    { Invoke-Health }
    "help"      { Invoke-Help }
    default     {
        if ($command) {
            Write-Err "Unknown command: $command"
        }
        Invoke-Help
    }
}
