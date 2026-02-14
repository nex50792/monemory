import { expect, test } from "@playwright/test";

test.use({
  storageState: "playwright/.auth/user.json",
});

test.describe("カテゴリとタグの管理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/entries");
    await expect(page.getByRole("heading", { name: "記録一覧" })).toBeVisible();
  });

  test("新規エントリー作成時にカテゴリを追加できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const newCategory = `テストカテゴリ ${Date.now()}`;
    await page.fill('input[placeholder="新規カテゴリ名を入力"]', newCategory);
    await page.getByRole("button", { name: "追加" }).first().click();

    await expect(page.getByRole('main').locator(`button:has-text("${newCategory}")`)).toBeVisible();

    await page.getByRole('main').locator(`button:has-text("${newCategory}")`).click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.fill('input[name="title"]', `カテゴリテスト ${Date.now()}`);
    await page.fill('input[name="amount"]', "3000");
    await page.getByRole("button", { name: "登録" }).click();

    await page.waitForURL("/");
  });

  test("新規エントリー作成時にタグを追加できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const newTag = `テストタグ ${Date.now()}`;
    await page.fill('input[placeholder="新規タグ名を入力"]', newTag);
    await page.getByRole("button", { name: "追加" }).nth(1).click();

    await expect(page.getByRole('main').locator(`button:has-text("${newTag}")`)).toBeVisible();

    await page.getByRole('main').locator(`button:has-text("${newTag}")`).click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.fill('input[name="title"]', `タグテスト ${Date.now()}`);
    await page.fill('input[name="amount"]', "4000");
    await page.getByRole("button", { name: "登録" }).click();

    await page.waitForURL("/");
  });

  test("編集画面でエントリーにカテゴリを設定できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    const testTitle = `カテゴリ編集テスト ${Date.now()}`;
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="amount"]', "5000");
    await page.getByRole("button", { name: "登録" }).click();

    await page.waitForURL(/\/entries\/[^/]+$/);

    await page.getByRole("button", { name: "編集", exact: true }).click();
    
    await page.waitForURL(/\/entries\/[^/]+\/edit/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const newCategory = `編集カテゴリ ${Date.now()}`;
    await page.fill('input[placeholder="新規カテゴリ名を入力"]', newCategory);
    await page.getByRole("button", { name: "追加" }).first().click();

    await page.getByRole('main').locator(`button:has-text("${newCategory}")`).click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: "更新" }).click();

    await page.waitForURL(/\/entries\/[^/]+$/);

    await expect(page.locator(`text=${newCategory}`)).toBeVisible();
  });

  test("編集画面でエントリーにタグを設定できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    const testTitle = `タグ編集テスト ${Date.now()}`;
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="amount"]', "6000");
    await page.getByRole("button", { name: "登録" }).click();

    await page.waitForURL("/");

    await page.getByText(testTitle).first().click();

    await page.getByRole("button", { name: "編集", exact: true }).click();
    
    await page.waitForURL(/\/entries\/[^/]+\/edit/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const newTag = `編集タグ ${Date.now()}`;
    await page.fill('input[placeholder="新規タグ名を入力"]', newTag);
    await page.getByRole("button", { name: "追加" }).nth(1).click();

    await page.getByRole('main').locator(`button:has-text("${newTag}")`).click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: "更新" }).click();

    await page.waitForURL(/\/entries\/[^/]+$/);
  });


  test("編集画面でカテゴリを削除できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    const testTitle = `カテゴリ削除テスト ${Date.now()}`;
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="amount"]', "1000");
    await page.getByRole("button", { name: "登録" }).click();
    await page.waitForURL("/");

    await page.getByText(testTitle).first().click();

    await page.getByRole("button", { name: "編集", exact: true }).click();
    
    await page.waitForURL(/\/entries\/[^/]+\/edit/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const categoryToDelete = `削除テストカテゴリ ${Date.now()}`;
    await page.fill('input[placeholder="新規カテゴリ名を入力"]', categoryToDelete);
    await page.getByRole("button", { name: "追加" }).first().click();

    await page.getByRole('main').locator(`button:has-text("${categoryToDelete}")`).waitFor({ state: 'visible' });

    await page.locator('button[title="削除モード"]').first().click();

    await page.getByRole('main').locator(`button:has-text("${categoryToDelete}")`).click();

    const deleteButton = page.locator(`button:has-text("選択したカテゴリを削除")`);
    await deleteButton.click();

    const modalLocator = page.locator('text=削除しますか');
    await modalLocator.waitFor({ state: 'visible' });

    const confirmButton = page.getByRole("button", { name: "はい" });
    await confirmButton.click();
    await modalLocator.waitFor({ state: 'hidden' });

    const categoryGone = await page.locator(`text=${categoryToDelete}`).isVisible().catch(() => false);
    expect(categoryGone).toBe(false);
  });

  test("編集画面でタグを削除できる", async ({ page }) => {
    await page.getByRole("button", { name: "新規登録" }).click();
    await page.waitForURL("/");

    const testTitle = `タグ削除テスト ${Date.now()}`;
    await page.fill('input[name="title"]', testTitle);
    await page.fill('input[name="amount"]', "1000");
    await page.getByRole("button", { name: "登録" }).click();
    await page.waitForURL("/");

    await page.getByText(testTitle).first().click();

    await page.getByRole("button", { name: "編集", exact: true }).click();
    
    await page.waitForURL(/\/entries\/[^/]+\/edit/);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const tagToDelete = `削除テストタグ ${Date.now()}`;
    await page.fill('input[placeholder="新規タグ名を入力"]', tagToDelete);
    await page.getByRole("button", { name: "追加" }).nth(1).click();

    await page.getByRole('main').locator(`button:has-text("${tagToDelete}")`).waitFor({ state: 'visible' });

    await page.locator('button[title="削除モード"]').nth(1).click();

    await page.getByRole('main').locator(`button:has-text("${tagToDelete}")`).click();

    const deleteTagButton = page.locator(`button:has-text("選択したタグを削除")`);
    await deleteTagButton.click();

    const tagModalLocator = page.locator('text=削除しますか');
    await tagModalLocator.waitFor({ state: 'visible' });

    const tagConfirmButton = page.getByRole("button", { name: "はい" });
    await tagConfirmButton.click();
    await tagModalLocator.waitFor({ state: 'hidden' });

    const tagGone = await page.locator(`text=${tagToDelete}`).isVisible().catch(() => false);
    expect(tagGone).toBe(false);
  });

  test("一覧画面でカテゴリでフィルタリングできる", async ({ page }) => {
    await page.locator('button[title="フィルター"]').click();

    const categoryButtons = page.locator('div:has-text("カテゴリ") + div button');
    await categoryButtons.first().click();

    await page.getByRole("button", { name: "適用" }).click();
    await expect(page.getByRole("heading", { name: "記録一覧" })).toBeVisible();
  });

  test("一覧画面でタグでフィルタリングできる", async ({ page }) => {
    await page.locator('button[title="フィルター"]').click();

    const tagButtons = page.locator('div:has-text("タグ") + div button');
    await tagButtons.first().click();

    await page.getByRole("button", { name: "適用" }).click();
    await expect(page.getByRole("heading", { name: "記録一覧" })).toBeVisible();
  });
});