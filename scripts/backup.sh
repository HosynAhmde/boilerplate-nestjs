#!/usr/bin/env bash
# Nightly backup: database dump + uploaded files, kept for BACKUP_KEEP_DAYS.
# Cron example (02:30 every night):
#   30 2 * * * cd /opt/pasha-crm && ./scripts/backup.sh >> backups/backup.log 2>&1
# Copy the backups/ folder off the server too (rclone/rsync to object storage).
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; [ -f .env ] && . ./.env; set +a
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DIR="backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIR"

echo "[$(date -Is)] database dump"
docker compose exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-pasha}" -d "${POSTGRES_DB:-pasha_crm}" --format=custom --compress=9 \
  > "$DIR/db-$STAMP.dump"

# File storage volume (local driver). Skipped when the api container is absent.
if docker compose ps --status running --services 2>/dev/null | grep -qx api; then
  echo "[$(date -Is)] files"
  docker compose exec -T api tar -C /app/storage -czf - . > "$DIR/files-$STAMP.tar.gz"
fi

find "$DIR" -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name 'files-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "[$(date -Is)] done: $DIR/db-$STAMP.dump"
