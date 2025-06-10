/**
 * Production deployment validation and health checks
 */

export function validateProductionEnvironment(): {
  isReady: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (!process.env.DATABASE_URL) {
    missing.push("DATABASE_URL - PostgreSQL connection string required for full functionality");
  }

  // Check optional but recommended environment variables
  if (!process.env.SESSION_SECRET) {
    warnings.push("SESSION_SECRET not set - using default (not recommended for production)");
  }

  const isReady = missing.length === 0;

  return {
    isReady,
    missing,
    warnings
  };
}

export function logProductionStatus() {
  const status = validateProductionEnvironment();
  
  console.log("=== Production Environment Check ===");
  
  if (status.isReady) {
    console.log("✅ Production environment is ready for deployment");
  } else {
    console.log("❌ Production environment needs configuration:");
    status.missing.forEach(item => console.log(`  - ${item}`));
  }
  
  if (status.warnings.length > 0) {
    console.log("⚠️  Warnings:");
    status.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  console.log("=====================================");
}