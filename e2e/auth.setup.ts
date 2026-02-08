import { expect, test as setup } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

setup("ユーザー認証", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("TEST_USER_EMAIL と TEST_USER_PASSWORD 環境変数が設定されていません");
  }

  await page.goto("/sign-in");

  // ページ内容をデバッグログに出力
  const pageContent = await page.content();
  const isSignInPage = pageContent.includes('identifier') || pageContent.includes('Clerk');
  console.log(`Is sign-in page: ${isSignInPage}`);
  console.log(`Current URL: ${page.url()}`);

  await page.waitForSelector('[name="identifier"]', { timeout: 30000 });

  await page.fill('[name="identifier"]', email);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForSelector('[name="password"]', { timeout: 30000 });
  await page.fill('[name="password"]', password);
  await page.getByRole("button", { name: /continue/i }).click();


  await page.waitForURL("/", { timeout: 15000 });
  await expect(page.locator("body")).toBeVisible();

  await page.context().storageState({ path: authFile });
});
