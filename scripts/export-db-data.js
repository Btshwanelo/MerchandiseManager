/**
 * Database Export Script
 * This script exports all data from a database to JSON files
 * 
 * Usage:
 *   node scripts/export-db-data.js [source]
 * 
 * Where 'source' is either:
 *   - 'prod' (default) - Export from production database
 *   - 'dev' - Export from development database
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

// Determine which database to export from based on command-line argument
const args = process.argv.slice(2);
const source = (args[0] || 'prod').toLowerCase();

if (source !== 'prod' && source !== 'dev') {
  console.error('Error: Invalid source. Use either "prod" or "dev"');
  process.exit(1);
}

const DATABASE_URL = source === 'prod' ? PROD_DATABASE_URL : DEV_DATABASE_URL;

if (!DATABASE_URL) {
  console.error(`Error: ${source === 'prod' ? 'PROD_DATABASE_URL' : 'DEV_DATABASE_URL/DATABASE_URL'} environment variable must be set`);
  process.exit(1);
}

// Define all tables to export
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
  // Add any other tables you need to export
];

// Create database connection
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function exportDatabase() {
  try {
    console.log(`Starting ${source} database export process...`);
    
    // Create export directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(process.cwd(), 'exports', `${source}_${timestamp}`);
    
    fs.mkdirSync(exportDir, { recursive: true });
    console.log(`Export directory created: ${exportDir}`);
    
    // Export all tables
    const exportSummary = {};
    
    for (const table of tables) {
      console.log(`Exporting table: ${table.name}`);
      
      // Fetch all records from the table
      const records = await db.select().from(table.schema);
      console.log(`  Retrieved ${records.length} records`);
      
      // Write records to a JSON file
      const filePath = path.join(exportDir, `${table.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
      console.log(`  Exported to: ${filePath}`);
      
      exportSummary[table.name] = records.length;
    }
    
    // Create a summary file
    const summaryFile = path.join(exportDir, 'export-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify({
      source,
      timestamp: new Date().toISOString(),
      tables: exportSummary
    }, null, 2));
    
    console.log(`Export completed successfully to: ${exportDir}`);
  } catch (error) {
    console.error('Error exporting database:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

exportDatabase();