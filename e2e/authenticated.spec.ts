import { expect, test } from "@playwright/test";

test.use({
  storageState: "playwright/.auth/user.json",
});

test.describe("認証済みユーザー", () => {
  test("エントリー一覧ページにアクセスできる", async ({ page }) => {
    await page.goto("/entries");
    await expect(page).toHaveURL("/entries");
    await expect(page.locator("body")).toBeVisible();
  });

  test("エントリー一覧を取得できる", async ({ page }) => {
    await page.goto("/entries");
    await expect(page).toHaveURL("/entries");

    await expect(page.getByRole("heading", { name: "記録一覧" })).toBeVisible({
      timeout: 10000,
    });

    await page.waitForFunction(() => !document.body.innerText.includes("データを読み込み中です"));

    const entryList = page.locator("ul.space-y-4");
    const noEntriesMessage = page.locator("text=登録がありません");

    const hasEntries = await entryList.isVisible().catch(() => false);
    const hasNoEntries = await noEntriesMessage.isVisible().catch(() => false);

    expect(hasEntries || hasNoEntries).toBe(true);
  });
});
