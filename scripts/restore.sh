#!/usr/bin/env bash
# Restores a database dump made by backup.sh. DESTRUCTIVE: replaces current data.
#   ./scripts/restore.sh backups/db-20261031-023000.dump
set -euo pipefail
cd "$(dirname "$0")/.."
DUMP="${1:?usage: restore.sh <backups/db-*.dump>}"
set -a; [ -f .env ] && . ./.env; set +a

read -r -p "This replaces ALL data in ${POSTGRES_DB:-pasha_crm}. Type the database name to continue: " answer
[ "$answer" = "${POSTGRES_DB:-pasha_crm}" ] || { echo "aborted"; exit 1; }

docker compose stop api web 2>/dev/null || true
docker compose exec -T postgres \
  pg_restore -U "${POSTGRES_USER:-pasha}" -d "${POSTGRES_DB:-pasha_crm}" --clean --if-exists --no-owner \
  < "$DUMP"
docker compose --profile app up -d api web
echo "restored from $DUMP"
