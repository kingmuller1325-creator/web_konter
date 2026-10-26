#!/bin/bash
# Restore script for Konteros database

set -e

# Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-konteros}"
DB_PASSWORD="${DB_PASSWORD}"

BACKUP_FILE="${1}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "[$(date)] Starting restore from ${BACKUP_FILE}..."

# Confirm
read -p "This will REPLACE the current database. Are you sure? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  exit 1
fi

# Restore database
gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}"

if [ ${PIPESTATUS[1]} -ne 0 ]; then
  echo "[$(date)] ERROR: Restore failed"
  exit 1
fi

echo "[$(date)] Restore completed successfully"