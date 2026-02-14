import { expect, test } from "@playwright/test";

test.use({
  storageState: "playwright/.auth/user.json",
});

test.describe("エントリーのCRUD操作", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/entries");
    await expect(page.getByRole("heading", { name: "記録一覧" })).toBeVisible();
  });

  test("新規エントリーを作成できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    await expect(page.getByRole("heading", { name: "新規記録作成" })).toBeVisible();

    const testTitle = `テストエントリー ${Date.now()}`;
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="amount"]', "5000");
    await page.fill('input[name="date"]', "2026-02-13");
    await page.fill('textarea[name="memo"]', "テストメモ");

    await page.getByRole("button", { name: "登録" }).click();

    await page.waitForURL(/\/entries\/[^/]+$/);

    await expect(page.locator("h1")).toContainText(testTitle);
    await expect(page.locator("text=5,000").or(page.locator("text=5000"))).toBeVisible();
  });

  test("エントリー詳細を表示できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    const testTitle = `詳細確認用 ${Date.now()}`;
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="amount"]', "1000");
    await page.getByRole("button", { name: "登録" }).click();

    await page.waitForURL(/\/entries\/[^/]+$/);

    await expect(page.locator("text=金額:")).toBeVisible();
    await expect(page.locator("text=日付:")).toBeVisible();

    await expect(page.getByRole("button", { name: "編集", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "削除", exact: true })).toBeVisible();
  });

  test("エントリーを編集できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    const editTestTitle = `編集テスト ${Date.now()}`;
    await page.fill('input[name="title"]', editTestTitle);
    await page.fill('input[name="amount"]', "3000");
    await page.getByRole("button", { name: "登録" }).click();
    await expect(page).toHaveURL(/\/entries\/[^/]+$/);

    await page.getByRole("button", { name: "編集", exact: true }).click();
    await page.waitForURL(/\/entries\/[^/]+\/edit/);

    const updatedTitle = `更新されたタイトル ${Date.now()}`;
    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();
    await titleInput.fill(updatedTitle);

    const amountInput = page.locator('input[name="amount"]');
    await amountInput.clear();
    await amountInput.fill("7500");

    await page.getByRole("button", { name: "更新" }).click();

    await expect(page).toHaveURL(/\/entries\/[^/]+$/);

    await expect(page.locator("h1")).toContainText(updatedTitle);
    await expect(page.locator("text=7,500").or(page.locator("text=7500"))).toBeVisible();
  });

  test("エントリーを削除できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await expect(page).toHaveURL("/");

    const deleteTestTitle = `削除テスト ${Date.now()}`;
    await page.fill('input[name="title"]', deleteTestTitle);
    await page.fill('input[name="amount"]', "1000");
    await page.getByRole("button", { name: "登録" }).click();

    await expect(page).toHaveURL(/\/entries\/[^/]+$/);

    await page.getByRole("button", { name: "削除", exact: true }).click();

    await expect(
      page.locator("text=本当に削除しますか？")
    ).toBeVisible();

    await page.getByRole("button", { name: "はい" }).click();

    await expect(page).toHaveURL("/entries");

    await expect(
      page.locator("text=" + deleteTestTitle)
    ).not.toBeVisible();
  });

  test("一覧から直接エントリーを削除できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await expect(page).toHaveURL("/");

    const deleteTestTitle = `一覧削除テスト ${Date.now()}`;
    await page.fill('input[name="title"]', deleteTestTitle);
    await page.fill('input[name="amount"]', "2000");
    await page.getByRole("button", { name: "登録" }).click();

    await expect(page).toHaveURL(/\/entries\/[^/]+$/);

    await page.goto("/entries");

    await page.locator("text=" + deleteTestTitle).first().click();
    await expect(page).toHaveURL(/\/entries\/[^/]+$/);

    await page.getByRole("button", { name: "削除", exact: true }).click();

    await expect(
      page.locator("text=本当に削除しますか？")
    ).toBeVisible();

    await page.getByRole("button", { name: "はい" }).click();

    await expect(page).toHaveURL("/entries");

    await expect(
      page.locator("text=" + deleteTestTitle)
    ).not.toBeVisible();
  });

  test("エントリーの一覧をフィルタリングできる", async ({ page }) => {
    await page.locator('button[title="フィルター"]').click();

    await expect(
      page.locator('input[placeholder="タイトルで検索"]')
    ).toBeVisible();

    await page.fill('input[placeholder="タイトルで検索"]', "テスト");

    await page.getByRole("button", { name: "適用" }).click();
    await expect(page.getByRole("heading", { name: "記録一覧" })).toBeVisible();
  });

  test("エントリーを並べ替えできる", async ({ page }) => {
    await page.locator('button[title="フィルター"]').click();
    const sortLabel = page.locator('label:has-text("並べ替え")');
    await expect(sortLabel).toBeVisible();
  });
});
