/**
 * Selective Table Sync Script
 * 
 * This script allows syncing specific tables from production to development,
 * preserving foreign key relationships.
 * 
 * Usage: 
 *   node scripts/sync-specific-tables.js <table1,table2,table3,...>
 *   
 * Example:
 *   node scripts/sync-specific-tables.js users,products,shelves
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL;
const DEV_DATABASE_URL = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;

if (!PROD_DATABASE_URL) {
  console.error('Error: PROD_DATABASE_URL environment variable must be set');
  process.exit(1);
}

if (!DEV_DATABASE_URL) {
  console.error('Error: Neither DEV_DATABASE_URL nor DATABASE_URL environment variables are set');
  process.exit(1);
}

// Map of all available tables
const tableMap = {
  users: schema.users,
  stores: schema.stores,
  products: schema.products,
  shelves: schema.shelves,
  inventory: schema.inventory,
  activities: schema.activities,
  alerts: schema.alerts,
  store_assignments: schema.storeAssignments,
  stock_takes: schema.stockTakes,
  work_items: schema.workItems,
  // Add any other tables in your schema
};

// Get tables to sync from command line argument
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Please specify tables to sync. Example: node scripts/sync-specific-tables.js users,products,shelves');
  console.log('Available tables:');
  Object.keys(tableMap).forEach(tableName => {
    console.log(`  - ${tableName}`);
  });
  process.exit(1);
}

const tablesToSync = args[0].split(',');

// Validate table names
const invalidTables = tablesToSync.filter(tableName => !tableMap[tableName]);
if (invalidTables.length > 0) {
  console.error(`Error: Invalid table name(s): ${invalidTables.join(', ')}`);
  console.log('Available tables:');
  Object.keys(tableMap).forEach(tableName => {
    console.log(`  - ${tableName}`);
  });
  process.exit(1);
}

// Create the tables array for syncing
const tables = tablesToSync.map(tableName => ({
  name: tableName,
  schema: tableMap[tableName]
}));

// Create connections to both databases
const prodPool = new Pool({ connectionString: PROD_DATABASE_URL });
const prodDb = drizzle({ client: prodPool, schema });

const devPool = new Pool({ connectionString: DEV_DATABASE_URL });
const devDb = drizzle({ client: devPool, schema });

async function syncSpecificTables() {
  try {
    console.log(`Starting sync process for tables: ${tablesToSync.join(', ')}`);
    
    // Create a backup of the selected tables from dev database
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `dev_tables_backup_${timestamp}.json`);
    
    // Backup selected tables
    const devBackup = {};
    for (const table of tables) {
      console.log(`Backing up dev table: ${table.name}`);
      devBackup[table.name] = await devDb.select().from(table.schema);
    }
    
    fs.writeFileSync(backupFile, JSON.stringify(devBackup, null, 2));
    console.log(`Development tables backed up to: ${backupFile}`);
    
    // Process each table
    for (const table of tables) {
      console.log(`Processing table: ${table.name}`);
      
      // Fetch all records from production
      console.log(`  Fetching data from production table: ${table.name}`);
      const prodRecords = await prodDb.select().from(table.schema);
      console.log(`  Retrieved ${prodRecords.length} records from production`);
      
      if (prodRecords.length === 0) {
        console.log(`  No records found in production for ${table.name}, skipping`);
        continue;
      }
      
      // Clear the development table
      console.log(`  Clearing development table: ${table.name}`);
      await devDb.delete(table.schema);
      
      // Insert production records into development
      console.log(`  Inserting ${prodRecords.length} records into development table: ${table.name}`);
      
      // Insert in batches to avoid memory issues
      const BATCH_SIZE = 100;
      for (let i = 0; i < prodRecords.length; i += BATCH_SIZE) {
        const batch = prodRecords.slice(i, i + BATCH_SIZE);
        await devDb.insert(table.schema).values(batch);
        console.log(`  Inserted batch ${i/BATCH_SIZE + 1} of ${Math.ceil(prodRecords.length/BATCH_SIZE)}`);
      }
      
      console.log(`  Successfully synced ${table.name}`);
    }
    
    console.log('Table sync completed successfully!');
  } catch (error) {
    console.error('Error syncing tables:', error);
  } finally {
    // Close database connections
    await prodPool.end();
    await devPool.end();
  }
}

syncSpecificTables();