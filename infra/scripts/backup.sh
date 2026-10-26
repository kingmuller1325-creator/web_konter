#!/bin/bash
# Backup script for Konteros database
# Runs daily via cron

set -e

# Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-konteros}"
DB_PASSWORD="${DB_PASSWORD}"

BACKUP_DIR="/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/konteros_${DATE}.sql.gz"

# R2 Configuration (optional)
R2_ENDPOINT="${R2_ENDPOINT}"
R2_ACCESS_KEY="${R2_ACCESS_KEY}"
R2_SECRET_KEY="${R2_SECRET_KEY}"
R2_BUCKET="${R2_BUCKET}"

# Retention (days)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup..."

# Dump database
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists | gzip > "${BACKUP_FILE}"

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "[$(date)] ERROR: pg_dump failed"
  exit 1
fi

echo "[$(date)] Backup created: ${BACKUP_FILE}"

# Upload to R2 if configured
if [ -n "${R2_ENDPOINT}" ] && [ -n "${R2_BUCKET}" ]; then
  echo "[$(date)] Uploading to R2..."
  
  # Using rclone (install if needed)
  if command -v rclone &> /dev/null; then
    rclone copy "${BACKUP_FILE}" "r2:${R2_BUCKET}/backups/" \
      --config /dev/null \
      --s3-provider Cloudflare \
      --s3-endpoint "${R2_ENDPOINT}" \
      --s3-access-key-id "${R2_ACCESS_KEY}" \
      --s3-secret-access-key "${R2_SECRET_KEY}"
    
    echo "[$(date)] Uploaded to R2"
  else
    echo "[$(date)] WARNING: rclone not installed, skipping R2 upload"
  fi
fi

# Clean old local backups
find "${BACKUP_DIR}" -name "konteros_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"

# Clean old R2 backups (if rclone available)
if [ -n "${R2_ENDPOINT}" ] && [ -n "${R2_BUCKET}" ] && command -v rclone &> /dev/null; then
  rclone delete "r2:${R2_BUCKET}/backups/" \
    --config /dev/null \
    --s3-provider Cloudflare \
    --s3-endpoint "${R2_ENDPOINT}" \
    --s3-access-key-id "${R2_ACCESS_KEY}" \
    --s3-secret-access-key "${R2_SECRET_KEY}" \
    --min-age ${RETENTION_DAYS}d
  echo "[$(date)] Cleaned old R2 backups"
fi

echo "[$(date)] Backup completed successfully"