# Database Sync Guide

This guide explains how to sync your production database to your development environment.

## Step 1: Set Up Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
# Your existing development database URL
DATABASE_URL=postgresql://username:password@hostname:port/database

# Production database URL (you need to get this from your production environment)
PROD_DATABASE_URL=postgresql://username:password@hostname:port/database
```

## Step 2: Choose a Sync Method

### Option A: Using Drizzle ORM (Recommended)

This method uses JavaScript and the Drizzle ORM to sync data, making it compatible with most environments.

1. Install the required dependencies:

```bash
npm install dotenv
```

2. Run the sync script:

```bash
# Using Node directly
node scripts/sync-db.js

# Alternatively, sync only specific tables
node scripts/sync-specific-tables.js users,products,stores
```

### Option B: Using PostgreSQL Tools

This method uses PostgreSQL's native `pg_dump` and `psql` tools, which may provide better performance for large databases.

1. Make sure PostgreSQL client tools are installed on your machine:
   - On Ubuntu/Debian: `sudo apt install postgresql-client`
   - On macOS with Homebrew: `brew install libpq`
   - On Windows: Install from the PostgreSQL installer

2. Make the script executable:

```bash
chmod +x scripts/sync-db-using-dump.sh
```

3. Run the script:

```bash
./scripts/sync-db-using-dump.sh
```

## Step 3: Verify the Sync

After syncing, verify that your development database now contains the production data:

1. Start your development server:

```bash
npm run dev
```

2. Check if the application shows the expected data.

3. You can also examine the backup files in the `./backups` directory to see what data was present before the sync.

## Getting Production Data Without Direct Database Access

If you don't have direct access to the production database, you can ask the production administrator to:

1. Run the export script on the production server:

```bash
node scripts/export-db-data.js prod
```

2. Send you the generated JSON files from the `./exports` directory.

3. You can then manually import this data or write a simple import script.

## Security Considerations

1. **Never store production database credentials in your code repository**. Use environment variables or a secrets manager.

2. **Be cautious with sensitive data**. When syncing from production to development, consider if you need to anonymize any sensitive user data.

3. **Restrict access to backups**. The backup files in `./backups` and exports in `./exports` may contain sensitive information.

## Troubleshooting

- **"Connection refused" errors**: Check that the database URLs are correct and that your IP is allowed to connect to the databases.

- **Permission errors**: Ensure the database users have sufficient privileges to read/write to all tables.

- **Foreign key constraint errors**: Try using the `sync-db-using-dump.sh` script which handles foreign key constraints properly.

- **Memory issues**: For very large databases, try syncing specific tables instead of the entire database.

- **Conflicts with existing data**: The sync scripts replace all data in the target tables. If you need to merge data instead, you'll need to modify the scripts.