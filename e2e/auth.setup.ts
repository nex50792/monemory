import { expect, test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = path.join(process.cwd(), "playwright/.auth/user.json");

setup("ユーザー認証", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("TEST_USER_EMAIL と TEST_USER_PASSWORD 環境変数が設定されていません");
  }

  // 前回の認証情報を削除（リダイレクトループを防ぐ）
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }

  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");

  await page.getByPlaceholder("Enter your email address").waitFor({ timeout: 30000 });

  await page.getByPlaceholder("Enter your email address").fill(email);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.getByPlaceholder("Enter your password").waitFor({ timeout: 30000 });
  await page.getByPlaceholder("Enter your password").fill(password);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForURL("/", { timeout: 15000 });
  await expect(page.locator("body")).toBeVisible();

  await page.context().storageState({ path: authFile });
});
