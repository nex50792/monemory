import { expect, test } from "@playwright/test";

test.describe("ログイン機能", () => {
  test("未認証ユーザーは保護されたページにアクセスできず、ログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/entries");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("ログインページが正しく表示される", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator('[name="identifier"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("有効な認証情報でログインできる", async ({ page }) => {
    await page.goto("/sign-in");

    await page.fill('[name="identifier"]', process.env.TEST_USER_EMAIL || "");
    await page.getByRole("button", { name: /continue/i }).click();

    await page.waitForSelector('[name="password"]');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || "");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL("/", { timeout: 15000 });
  });
});
