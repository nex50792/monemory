import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.CI) {
  dotenv.config({ path: path.resolve(__dirname, "e2e/.env.e2e") });
}

const getBaseURL = () => {
  if (process.env.CI) {
    return process.env.TEST_URL || "https://www.monemory.xyz";
  }
  return "http://localhost:3000";
};

const getAuthHeader = () => {
  const basicAuthUser = process.env.BASIC_AUTH_USER;
  const basicAuthPass = process.env.BASIC_AUTH_PASS;

  if (basicAuthUser && basicAuthPass) {
    const credentials = Buffer.from(`${basicAuthUser}:${basicAuthPass}`).toString("base64");
    return {
      Authorization: `Basic ${credentials}`,
    };
  }

  return undefined;
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: getBaseURL(),
    extraHTTPHeaders: getAuthHeader(),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
