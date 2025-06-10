import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon serverless with websockets for Replit environment
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
  // In production, we want to gracefully handle this rather than crash
  process.exit(1);
}

// Create a connection pool with error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Add connection error handling
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Add pool error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Create a Drizzle ORM instance with the schema
export const db = drizzle(pool, { schema });

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Add query logging with proper types
const originalQuery = pool.query.bind(pool);
pool.query = function(queryTextOrConfig: any, ...args: any[]) {
  console.log('SQL Query:', queryTextOrConfig);
  return originalQuery(queryTextOrConfig, ...args);
};