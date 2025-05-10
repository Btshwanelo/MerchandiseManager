/**
 * Database Sync Script
 * This script facilitates syncing data from a production database to a development database.
 * It requires both DATABASE_URL environment variables to be set:
 * - PROD_DATABASE_URL: URL for the production database
 * - DEV_DATABASE_URL: URL for the development database (defaults to DATABASE_URL)
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

// Create connections to both databases
const prodPool = new Pool({ connectionString: PROD_DATABASE_URL });
const prodDb = drizzle({ client: prodPool, schema });

const devPool = new Pool({ connectionString: DEV_DATABASE_URL });
const devDb = drizzle({ client: devPool, schema });

// Define all tables to sync
const tables = [
  { name: 'users', schema: schema.users },
  { name: 'stores', schema: schema.stores },
  { name: 'products', schema: schema.products },
  { name: 'shelves', schema: schema.shelves },
  { name: 'inventory', schema: schema.inventory },
  { name: 'activities', schema: schema.activities },
  { name: 'alerts', schema: schema.alerts },
  { name: 'store_assignments', schema: schema.storeAssignments },
  { name: 'stock_takes', schema: schema.stockTakes },
  { name: 'work_items', schema: schema.workItems },
  // Add any other tables you need to sync
];

async function syncDatabase() {
  try {
    console.log('Starting database sync process...');
    
    // Create a backup of the dev database first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `dev_db_backup_${timestamp}.json`);
    
    // Backup all dev data
    const devBackup = {};
    for (const table of tables) {
      console.log(`Backing up dev table: ${table.name}`);
      devBackup[table.name] = await devDb.select().from(table.schema);
    }
    
    fs.writeFileSync(backupFile, JSON.stringify(devBackup, null, 2));
    console.log(`Development database backed up to: ${backupFile}`);
    
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
    
    console.log('Database sync completed successfully!');
  } catch (error) {
    console.error('Error syncing database:', error);
  } finally {
    // Close database connections
    await prodPool.end();
    await devPool.end();
  }
}

syncDatabase();