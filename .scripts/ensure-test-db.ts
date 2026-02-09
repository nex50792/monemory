import { spawnSync } from "child_process";
import net from "net";

/**
 * Check if PostgreSQL is running on the test port
 */
function isPostgresRunning(
  host: string = "localhost",
  port: number = 5432
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Start docker-compose if PostgreSQL is not running
 */
async function ensureTestDb(): Promise<void> {
  console.log("🔍 Checking test database availability...");

  const isRunning = await isPostgresRunning();

  if (isRunning) {
    console.log("✅ Test database is already running");
    return;
  }

  console.log("🚀 Starting test database (docker-compose)...");

  const result = spawnSync(
    "docker-compose",
    ["-f", "docker-compose.test.yml", "up", "-d"],
    {
      stdio: "inherit",
      cwd: process.cwd(),
    }
  );

  if (result.error) {
    console.error("❌ Failed to start docker-compose:", result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("❌ docker-compose exited with status", result.status);
    process.exit(result.status || 1);
  }

  console.log("⏳ Waiting for PostgreSQL to be ready...");
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    const ready = await isPostgresRunning();
    if (ready) {
      console.log("✅ Test database is ready!");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    attempts++;
  }

  console.error("❌ Test database did not become ready in time");
  process.exit(1);
}

ensureTestDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
