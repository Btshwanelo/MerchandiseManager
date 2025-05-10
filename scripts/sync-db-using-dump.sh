#!/bin/bash
# Database Sync Script Using pg_dump and psql
# This script facilitates syncing data from a production database to a development database.
# It requires both database connection parameters to be set correctly.

# Set environment variables (or set them before running the script)
# PROD_DB_URL should be in the format: postgresql://username:password@hostname:port/database
PROD_DB_URL=${PROD_DB_URL:-$1}
DEV_DB_URL=${DEV_DB_URL:-$DATABASE_URL}

# Check if both URLs are set
if [ -z "$PROD_DB_URL" ]; then
  echo "Error: PROD_DB_URL environment variable must be set or provided as the first argument"
  exit 1
fi

if [ -z "$DEV_DB_URL" ]; then
  echo "Error: DEV_DB_URL or DATABASE_URL environment variable must be set"
  exit 1
fi

# Create a directory for backups
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate a timestamp
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Extract connection parameters from URLs
# Production
PROD_USER=$(echo $PROD_DB_URL | sed -n 's|^postgresql://\([^:]*\).*|\1|p')
PROD_PASS=$(echo $PROD_DB_URL | sed -n 's|^postgresql://[^:]*:\([^@]*\).*|\1|p')
PROD_HOST=$(echo $PROD_DB_URL | sed -n 's|^postgresql://[^@]*@\([^:/]*\).*|\1|p')
PROD_PORT=$(echo $PROD_DB_URL | sed -n 's|^postgresql://[^@]*@[^:]*:\([^/]*\).*|\1|p')
PROD_DB=$(echo $PROD_DB_URL | sed -n 's|^postgresql://[^@]*@[^:]*:[^/]*/\(.*\)|\1|p')

# Development
DEV_USER=$(echo $DEV_DB_URL | sed -n 's|^postgresql://\([^:]*\).*|\1|p')
DEV_PASS=$(echo $DEV_DB_URL | sed -n 's|^postgresql://[^:]*:\([^@]*\).*|\1|p')
DEV_HOST=$(echo $DEV_DB_URL | sed -n 's|^postgresql://[^@]*@\([^:/]*\).*|\1|p')
DEV_PORT=$(echo $DEV_DB_URL | sed -n 's|^postgresql://[^@]*@[^:]*:\([^/]*\).*|\1|p')
DEV_DB=$(echo $DEV_DB_URL | sed -n 's|^postgresql://[^@]*@[^:]*:[^/]*/\(.*\)|\1|p')

# Set environment variables for pg_dump and psql
export PGPASSWORD="$PROD_PASS"

# Backup dev database first
echo "Backing up development database..."
DEV_DUMP_FILE="$BACKUP_DIR/dev_db_backup_$TIMESTAMP.sql"
PGPASSWORD="$DEV_PASS" pg_dump -h "$DEV_HOST" -p "$DEV_PORT" -U "$DEV_USER" "$DEV_DB" > "$DEV_DUMP_FILE"
echo "Development database backed up to: $DEV_DUMP_FILE"

# Dump production database
echo "Dumping production database..."
PROD_DUMP_FILE="$BACKUP_DIR/prod_db_dump_$TIMESTAMP.sql"
pg_dump -h "$PROD_HOST" -p "$PROD_PORT" -U "$PROD_USER" "$PROD_DB" > "$PROD_DUMP_FILE"
echo "Production database dumped to: $PROD_DUMP_FILE"

# Set environment variables for psql
export PGPASSWORD="$DEV_PASS"

# Confirm action
read -p "Are you sure you want to REPLACE all data in the development database with production data? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operation canceled."
  exit 0
fi

# Drop all tables in development database
echo "Dropping all tables in development database..."
PGPASSWORD="$DEV_PASS" psql -h "$DEV_HOST" -p "$DEV_PORT" -U "$DEV_USER" "$DEV_DB" <<EOF
-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Get all tables and drop them
DO \$\$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END \$\$;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';
EOF

# Restore production dump to development database
echo "Restoring production dump to development database..."
PGPASSWORD="$DEV_PASS" psql -h "$DEV_HOST" -p "$DEV_PORT" -U "$DEV_USER" "$DEV_DB" < "$PROD_DUMP_FILE"

echo "Database sync completed successfully!"