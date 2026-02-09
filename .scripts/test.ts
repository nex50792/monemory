import { execSync } from "child_process";

/**
 * Complete test workflow:
 * 1. Start test database (docker-compose)
 * 2. Push schema to database
 * 3. Run tests
 * 4. Cleanup (stop containers)
 */
async function runTests(): Promise<void> {
  // Ensure test environment variables are always set
  const testEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/monemory_test",
    DIRECT_URL: process.env.DIRECT_URL || "postgresql://test:test@localhost:5432/monemory_test",
  };

  try {
    console.log("🟡 Starting test workflow...\n");

    console.log("📦 Step 1: Ensuring test database...");
    execSync("tsx .scripts/ensure-test-db.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: testEnv,
    });

    console.log("\n📋 Step 2: Pushing schema...");
    execSync("tsx .scripts/db-push-test-run.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: testEnv,
    });

    console.log("\n🧪 Step 3: Running tests...");
    execSync("vitest --run", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: testEnv,
    });

    console.log("\n✅ Tests completed successfully");
  } catch (error) {
    console.error("\n❌ Test workflow failed");
    throw error;
  } finally {
    console.log("\n🧹 Step 4: Cleaning up (stopping containers)...");
    try {
      execSync("docker-compose -f docker-compose.test.yml down", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      console.log("✅ Cleanup complete\n");
    } catch (err) {
      console.warn(
        "⚠️  Cleanup warning: Could not stop containers automatically. Run: docker-compose -f docker-compose.test.yml down", err
      );
    }
  }
}

runTests().catch(() => {
  process.exit(1);
});
