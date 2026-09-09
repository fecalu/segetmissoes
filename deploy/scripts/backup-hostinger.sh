#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/segetmissoes}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
DB_CONTAINER="${DB_CONTAINER:-seget_db}"
DB_USER="${POSTGRES_USER:-frota_user}"
DB_NAME="${POSTGRES_DB:-frota_db}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/seget-db-$STAMP.sql"
docker run --rm -v seget_uploads:/uploads -v "$BACKUP_DIR":/backup alpine \
  tar czf "/backup/seget-uploads-$STAMP.tar.gz" /uploads

echo "Backups criados em $BACKUP_DIR"
