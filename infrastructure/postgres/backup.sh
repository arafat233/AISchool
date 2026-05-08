#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/school_erp_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-school_erp}" \
  "${POSTGRES_DB:-school_erp}" | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup written to: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

if [ -n "${AWS_S3_BACKUP_BUCKET:-}" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BACKUP_BUCKET}/postgres/$(basename "$BACKUP_FILE")"
  echo "[$(date)] Uploaded to S3: s3://${AWS_S3_BACKUP_BUCKET}/postgres/"
fi

find "$BACKUP_DIR" -name "school_erp_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"
echo "[$(date)] Backup complete."
