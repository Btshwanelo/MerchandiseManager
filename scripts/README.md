# Database Sync Tools

This directory contains scripts for syncing data between your production and development databases.

## Prerequisites

Before using these scripts, you need to set up the following environment variables:

```bash
# Production database URL (required for all sync operations)
export PROD_DATABASE_URL=postgresql://username:password@hostname:port/database

# Development database URL (defaults to DATABASE_URL if not set)
export DEV_DATABASE_URL=postgresql://username:password@hostname:port/database
```

## Available Scripts

### 1. Full Database Sync (JavaScript/Drizzle ORM)

This script syncs all tables from production to development using Drizzle ORM.

```bash
node scripts/sync-db.js
```

### 2. Selective Table Sync

This script allows you to specify which tables to sync from production to development.

```bash
# Syntax
node scripts/sync-specific-tables.js table1,table2,table3,...

# Example - sync only users and products
node scripts/sync-specific-tables.js users,products
```

### 3. Database Export

Export all tables from either production or development database to JSON files.

```bash
# Export from production (default)
node scripts/export-db-data.js prod

# Export from development
node scripts/export-db-data.js dev
```

### 4. Sync Using PostgreSQL Dump (pg_dump/psql)

This script uses native PostgreSQL tools to create a full database dump and restore it.

```bash
# Make the script executable first
chmod +x scripts/sync-db-using-dump.sh

# Run the script
./scripts/sync-db-using-dump.sh
```

## Backup Safety

All scripts automatically create backups before making any changes:

- JavaScript scripts create JSON backups in the `./backups` directory
- The pg_dump script creates SQL dumps in the `./backups` directory

## Troubleshooting

If you encounter issues:

1. Check that both database URLs are correct and accessible
2. Make sure you have necessary permissions on both databases
3. For the pg_dump script, ensure that PostgreSQL client tools are installed
4. Examine any error messages for clues about what went wrong

## Important Notes

- Always make sure your production database URL is kept secure
- These scripts will overwrite data in your development database
- Consider running in a test environment first before using on your actual development database