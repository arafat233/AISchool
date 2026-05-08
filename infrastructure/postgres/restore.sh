#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

echo "[$(date)] Restoring from: $BACKUP_FILE"
PGPASSWORD="${POSTGRES_PASSWORD}" gunzip -c "$BACKUP_FILE" | psql \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-school_erp}" \
  "${POSTGRES_DB:-school_erp}"

echo "[$(date)] Restore complete."
