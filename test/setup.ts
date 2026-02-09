import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { afterAll, beforeAll, beforeEach } from "vitest";

let prisma: PrismaClient | null = null;

const DEFAULT_DATABASE_URL = "postgresql://test:test@localhost:5432/monemory_test";
const DEFAULT_DIRECT_URL = "postgresql://test:test@localhost:5432/monemory_test";

Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: DEFAULT_DATABASE_URL,
  DIRECT_URL: DEFAULT_DIRECT_URL,
});

beforeAll(async () => {
  console.log("🟡 Synchronizing test database schema...");
  try {
    execSync("tsx .scripts/db-push-test-run.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Schema synchronized successfully");
  } catch (e) {
    console.error(
      "❌ prisma db push failed in test setup. Ensure test DB is running at localhost:5432 and DATABASE_URL is correct.",
    );
    throw e;
  }
});

beforeEach(async () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    const tableNames = tables
      .map(({ tablename }) => `"${tablename}"`)
      .filter((name) => name !== '"_prisma_migrations"')
      .join(", ");

    if (tableNames) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE;`);
    }
  } catch (error) {
    console.error("Failed to truncate tables:", error);
    throw error;
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
});

export { };


