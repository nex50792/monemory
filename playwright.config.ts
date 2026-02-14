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

const getHttpCredentials = () => {
  const basicAuthUser = process.env.BASIC_AUTH_USER;
  const basicAuthPass = process.env.BASIC_AUTH_PASS;

  if (basicAuthUser && basicAuthPass) {
    return {
      username: basicAuthUser,
      password: basicAuthPass,
    };
  }

  return undefined;
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: getBaseURL(),
    httpCredentials: getHttpCredentials(),
    actionTimeout: 15000,
    navigationTimeout: 30000,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
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
