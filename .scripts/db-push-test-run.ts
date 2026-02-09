import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const DEFAULT_DATABASE_URL = "postgresql://test:test@localhost:5432/monemory_test";
const DEFAULT_DIRECT_URL = "postgresql://test:test@localhost:5432/monemory_test";

/**
 * Main execution
 */
function main(): void {
  const databaseUrl = DEFAULT_DATABASE_URL;
  const directUrl = DEFAULT_DIRECT_URL;
  const dotEnvPath = path.resolve(process.cwd(), ".env");
  const dotEnvBackupPath = path.resolve(process.cwd(), ".env.backup");

  console.log(
    "Running prisma db push against:",
    databaseUrl.replace(/:[^:@]+@/, ":***@")
  );

  // Only rename .env if:
  // 1. .env exists
  // 2. DATABASE_URL is not already set in environment (CI may have set it)
  let renamedDotEnv = false;
  if (fs.existsSync(dotEnvPath) && !process.env.DATABASE_URL) {
    try {
      fs.renameSync(dotEnvPath, dotEnvBackupPath);
      renamedDotEnv = true;
      console.log(".env renamed to .env.backup temporarily");
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.warn("Warning: Could not rename .env:", error);
    }
  }

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  };

  const result = spawnSync(
    "npx",
    [
      "prisma",
      "db",
      "push",
      "--skip-generate",
      "--schema=prisma/schema.prisma",
    ],
    {
      stdio: "inherit",
      env,
    }
  );

  if (renamedDotEnv && fs.existsSync(dotEnvBackupPath)) {
    try {
      fs.renameSync(dotEnvBackupPath, dotEnvPath);
      console.log(".env restored from backup");
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error("Error restoring .env:", error);
      process.exit(1);
    }
  }

  if (result.error) {
    console.error("failed to spawn prisma:", result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("prisma db push failed with status", result.status);
    process.exit(result.status || 1);
  }

  console.log("prisma db push completed successfully");
  process.exit(0);
}

main();
