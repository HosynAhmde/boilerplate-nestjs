#!/usr/bin/env bash
# Deploys or updates Pasha CRM on a single Linux server with Docker Compose.
# Run on the server, from the repo folder:  ./scripts/deploy.sh
#   1. pulls the latest code (skip with --no-pull)
#   2. takes a database backup
#   3. builds the images
#   4. runs migrations
#   5. restarts the services and waits for /health
set -euo pipefail
cd "$(dirname "$0")/.."

PULL=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

[ -f .env ] || { echo ".env not found. Copy .env.example to .env and fill it in." >&2; exit 1; }
grep -q '^NODE_ENV=production' .env || echo "warning: NODE_ENV in .env is not production (compose overrides it for the api)."
if grep -qE '^(JWT_ACCESS_SECRET|AUTH_HASH_PEPPER)=change-me' .env; then
  echo "Set real JWT_ACCESS_SECRET and AUTH_HASH_PEPPER in .env (openssl rand -base64 48)." >&2
  exit 1
fi

compose() { docker compose --profile app "$@"; }

if [ "$PULL" = 1 ] && [ -d .git ]; then
  echo "==> git pull"
  git pull --ff-only
fi
export APP_VERSION="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"

echo "==> starting database"
compose up -d postgres redis

if docker compose exec -T postgres true 2>/dev/null; then
  echo "==> backup before deploy"
  ./scripts/backup.sh || { echo "backup failed; aborting deploy" >&2; exit 1; }
fi

echo "==> building images ($APP_VERSION)"
compose build api web

echo "==> running migrations"
docker compose --profile tools run --rm migrate

echo "==> starting services"
compose up -d --remove-orphans api web caddy

echo "==> waiting for API health"
for i in $(seq 1 30); do
  if docker compose exec -T api wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null 2>&1; then
    echo "Deployed $APP_VERSION. All services healthy."
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done
echo "API did not become healthy. Check: docker compose logs api" >&2
exit 1
