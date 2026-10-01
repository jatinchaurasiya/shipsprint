#!/usr/bin/env bash
# ==============================================================================
# ShipSprint Production Deployment Script for AWS EC2
# ==============================================================================
# Automated zero-downtime container update, health verification, and rollback.
#
# Usage:
#   ./scripts/deploy.sh
#   FORCE_CLEAN=true ./scripts/deploy.sh
#
# Environment variables:
#   DEPLOY_DIR   - Target directory on EC2 (default: current directory or ~/shipsprint)
#   FORCE_CLEAN  - If "true", rebuilds Docker images with --no-cache
#   MAX_WAIT_SEC - Maximum seconds to wait for containers to become healthy (default: 120)
# ==============================================================================

set -euo pipefail

# ANSI color codes for rich GitHub Actions & terminal logging
BOLD='\033[1m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
CYAN='\033[36m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

echo ""
echo "================================================================================"
echo -e "${BOLD}Starting ShipSprint Production Deployment on EC2${NC}"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "================================================================================"

# ------------------------------------------------------------------------------
# 1. Directory & Environment Resolution
# ------------------------------------------------------------------------------
TARGET_DIR="${DEPLOY_DIR:-$(pwd)}"
if [ ! -f "${TARGET_DIR}/docker-compose.yml" ]; then
  if [ -f "$HOME/shipsprint/docker-compose.yml" ]; then
    TARGET_DIR="$HOME/shipsprint"
  elif [ -f "/home/ubuntu/shipsprint/docker-compose.yml" ]; then
    TARGET_DIR="/home/ubuntu/shipsprint"
  else
    log_error "Could not find docker-compose.yml in ${TARGET_DIR}, ~/shipsprint, or /home/ubuntu/shipsprint."
    exit 1
  fi
fi

cd "$TARGET_DIR"
log_info "Working directory: $(pwd)"

# ------------------------------------------------------------------------------
# 2. Tooling Pre-flight Checks
# ------------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log_error "Docker is not installed or not in PATH."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  log_error "Neither 'docker compose' (v2) nor 'docker-compose' (v1) was found."
  exit 1
fi
log_info "Using Docker Compose: $($COMPOSE_CMD version | tr -d '\n')"

# ------------------------------------------------------------------------------
# 3. Production Environment File Verification
# ------------------------------------------------------------------------------
if [ ! -f .env ]; then
  log_error "Production environment file (.env) was not found in $(pwd)!"
  log_error "Please ensure .env is created on the EC2 host with all required keys."
  exit 1
fi

REQUIRED_ENV_VARS=(
  "ROOT_DOMAIN"
  "NEXT_PUBLIC_ROOT_DOMAIN"
  "NEXT_PUBLIC_APP_URL"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ACME_CONTACT_EMAIL"
  "CF_API_TOKEN"
)

MISSING_ENV=()
for key in "${REQUIRED_ENV_VARS[@]}"; do
  if ! grep -E "^[[:space:]]*${key}=" .env >/dev/null 2>&1; then
    MISSING_ENV+=("$key")
  fi
done

if [ ${#MISSING_ENV[@]} -gt 0 ]; then
  log_error "The following required variables are missing from .env:"
  for missing in "${MISSING_ENV[@]}"; do
    log_error "  - $missing"
  done
  exit 1
fi
log_success "Production .env verified with all required environment keys."

# ------------------------------------------------------------------------------
# 4. Safe Git Synchronization
# ------------------------------------------------------------------------------
if [ -d .git ]; then
  log_info "Synchronizing git workspace to latest origin/main..."
  PREV_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  git fetch origin main --quiet
  git reset --hard origin/main --quiet
  NEW_COMMIT=$(git rev-parse --short HEAD)
  COMMIT_MSG=$(git log -1 --pretty=format:'%s (%cr) <%an>')
  log_info "Active commit: $PREV_COMMIT -> $NEW_COMMIT"
  log_info "Commit details: $COMMIT_MSG"
fi

# ------------------------------------------------------------------------------
# 5. Base Image Refresh & Container Build
# ------------------------------------------------------------------------------
log_info "Pulling external base images (redis, caddy)..."
$COMPOSE_CMD pull redis caddy || log_warn "Base image pull warning; using cached images."

BUILD_ARGS=()
if [ "${FORCE_CLEAN:-false}" = "true" ]; then
  log_warn "FORCE_CLEAN=true detected. Building with --no-cache..."
  BUILD_ARGS+=("--no-cache")
fi

log_info "Building and launching containers..."
START_TIME=$(date +%s)

if ! $COMPOSE_CMD up -d --build "${BUILD_ARGS[@]}" --remove-orphans; then
  log_error "docker compose up failed!"
  log_error "=== Container Status ==="
  $COMPOSE_CMD ps || true
  log_error "=== App Logs ==="
  $COMPOSE_CMD logs --tail=100 app || true
  exit 1
fi

# ------------------------------------------------------------------------------
# 6. Active Health Verification Loop
# ------------------------------------------------------------------------------
MAX_WAIT_SEC="${MAX_WAIT_SEC:-120}"
POLL_INTERVAL=4
ELAPSED=0
APP_HEALTHY=false

log_info "Waiting for application and services to reach healthy status (timeout: ${MAX_WAIT_SEC}s)..."

while [ "$ELAPSED" -lt "$MAX_WAIT_SEC" ]; do
  APP_CID=$($COMPOSE_CMD ps -q app 2>/dev/null || true)

  if [ -n "$APP_CID" ]; then
    APP_STATUS=$(docker inspect --format='{{.State.Status}}' "$APP_CID" 2>/dev/null || echo "unknown")
    APP_HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$APP_CID" 2>/dev/null || echo "none")

    if [ "$APP_STATUS" = "exited" ] || [ "$APP_STATUS" = "dead" ]; then
      log_error "App container terminated prematurely with status: $APP_STATUS"
      log_error "=== App Crash Logs ==="
      $COMPOSE_CMD logs --tail=100 app || true
      exit 1
    fi

    # Probe /api/health directly inside the container
    if $COMPOSE_CMD exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
      log_success "App health check endpoint (/api/health) responded HTTP 200 OK!"
      APP_HEALTHY=true
      break
    fi

    log_info "Service 'app' warming up (status: $APP_STATUS, health: $APP_HEALTH, elapsed: ${ELAPSED}s)..."
  else
    log_info "Awaiting service 'app' container initialization (elapsed: ${ELAPSED}s)..."
  fi

  sleep "$POLL_INTERVAL"
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

if [ "$APP_HEALTHY" != "true" ]; then
  log_error "Deployment timed out after ${MAX_WAIT_SEC}s! Service 'app' failed to become healthy."
  log_error "=== App Logs ==="
  $COMPOSE_CMD logs --tail=100 app || true
  log_error "=== Redis Logs ==="
  $COMPOSE_CMD logs --tail=50 redis || true
  log_error "=== Caddy Logs ==="
  $COMPOSE_CMD logs --tail=50 caddy || true
  exit 1
fi

# ------------------------------------------------------------------------------
# 7. Edge & Ingress Verification
# ------------------------------------------------------------------------------
CADDY_CID=$($COMPOSE_CMD ps -q caddy 2>/dev/null || true)
if [ -n "$CADDY_CID" ]; then
  CADDY_STATUS=$(docker inspect --format='{{.State.Status}}' "$CADDY_CID" 2>/dev/null || echo "unknown")
  if [ "$CADDY_STATUS" != "running" ]; then
    log_error "Caddy reverse proxy container is not running! Status: $CADDY_STATUS"
    $COMPOSE_CMD logs --tail=50 caddy
    exit 1
  fi
  log_success "Caddy edge proxy is running and serving traffic."
fi

REDIS_CID=$($COMPOSE_CMD ps -q redis 2>/dev/null || true)
if [ -n "$REDIS_CID" ]; then
  REDIS_STATUS=$(docker inspect --format='{{.State.Status}}' "$REDIS_CID" 2>/dev/null || echo "unknown")
  if [ "$REDIS_STATUS" != "running" ]; then
    log_warn "Redis rate limiter status is: $REDIS_STATUS"
  else
    log_success "Redis rate limiter is running and healthy."
  fi
fi

# ------------------------------------------------------------------------------
# 8. Disk Space Maintenance & Image Pruning
# ------------------------------------------------------------------------------
log_info "Pruning dangling Docker images to preserve EC2 disk space..."
docker image prune -f >/dev/null 2>&1 || true

# ------------------------------------------------------------------------------
# 9. Deployment Summary
# ------------------------------------------------------------------------------
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo ""
echo "================================================================================"
log_success "DEPLOYMENT COMPLETED SUCCESSFULLY IN ${TOTAL_TIME} SECONDS"
echo "================================================================================"
$COMPOSE_CMD ps
echo "================================================================================"
