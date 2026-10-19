import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec(`INSERT INTO category (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('page254-category','Archived pantry','archived pantry',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
    const insert = db.prepare(`INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?,?,? ,?,'default-unit-kilogram','2',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
    for (let index = 1; index <= 27; index++) {
      const number = String(index).padStart(2, "0");
      insert.run(`page254-${number}`, `Pagination Rice ${number}`, `pagination rice ${number}`, index <= 23 ? "page254-category" : "default-category-staples-dry-goods");
    }
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec("DELETE FROM item WHERE id LIKE 'page254-%'; DELETE FROM category WHERE id='page254-category'");
  } finally { db.close(); }
});

test.beforeEach(async ({ page }) => {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
});

async function ready(page: Page, url = "/inventory") {
  await page.goto(url);
  await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const directory = process.env.MASANAO_INVENTORY_PAGINATION_EVIDENCE_DIR;
  if (directory) mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: directory ? join(directory, name) : testInfo.outputPath(name), fullPage: true });
}

for (const width of [1280, 320]) {
  test(`combined filters, pagination and history work at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 800 });
    await ready(page, "/inventory?q=Pagination");
    const list = page.locator(width === 320 ? "[data-inventory-mobile]" : "[data-inventory-desktop]");
    const search = page.getByRole("searchbox", { name: "Search Inventory by Item name" });
    const category = page.getByRole("combobox", { name: "Category", exact: true });
    await expect(list.locator("[data-item-id]")).toHaveCount(10);
    await expect(page.getByText("Showing 1 to 10 of 27 results", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(list.locator('[data-item-id="page254-11"]')).toBeVisible();
    await category.focus();
    await category.press("Enter");
    await page.getByRole("option", { name: "Archived pantry", exact: true }).click();
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Out of stock", exact: true }).click();
    await expect(page).toHaveURL(/status=out-of-stock/);
    await expect(search).toHaveValue("Pagination");
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Page 3 of 3", exact: true }).click();
    await expect(list.locator("[data-item-id]")).toHaveCount(3);
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
    const categoryBox = await category.boundingBox();
    expect(categoryBox!.width).toBeGreaterThan(150);
    if (width === 1280) {
      const clearBox = await page.getByRole("button", { name: "Clear Category", exact: true }).boundingBox();
      expect(clearBox!.x).toBeGreaterThanOrEqual(categoryBox!.x + categoryBox!.width);
    }
    await capture(page, testInfo, `combined-page3-${width}.png`);
    if (width === 1280) {
      await page.setViewportSize({ width: 1024, height: 800 });
      expect((await category.boundingBox())!.width).toBeGreaterThan(150);
      await capture(page, testInfo, "combined-page3-1024.png");
      await page.setViewportSize({ width, height: 800 });
    }
    await page.goBack();
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    await page.goForward();
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    await expect(search).toHaveValue("Pagination");
    await expect(category).toContainText("Archived pantry");
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
    await search.fill("Pagination Rice 01");
    await expect(page).not.toHaveURL(/page=/);
    await expect(list.locator("[data-item-id]")).toHaveCount(1);
    await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
    await search.press("Tab");
    await expect(page.getByRole("button", { name: "Clear search", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(search).toHaveValue("");
    await expect(category).toContainText("Archived pantry");
    await expect(page).toHaveURL(/status=out-of-stock/);
    await page.getByRole("button", { name: "Clear Category", exact: true }).click();
    await expect(page).toHaveURL(/status=out-of-stock/);
    await search.fill("Pagination");
    await expect(page.getByText("Showing 1 to 10 of 27 results", { exact: true })).toBeVisible();
    await category.click();
    await page.getByRole("option", { name: "Archived pantry", exact: true }).click();
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear Stock status", exact: true }).click();
    await expect(category).toContainText("Archived pantry");
    await expect(search).toHaveValue("Pagination");
    await search.fill("No such item");
    await expect(page.getByText("No matching Items.", { exact: true })).toBeVisible();
    await expect(page.getByText("No results", { exact: true })).toBeVisible();
    await capture(page, testInfo, `no-match-${width}.png`);
    await page.getByRole("button", { name: "Clear all filters", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(search).toHaveValue("");
    await expect(list.locator("[data-item-id]")).toHaveCount(10);
    await capture(page, testInfo, `unfiltered-${width}.png`);
    await ready(page, "/inventory?q=Pagination&category=page254-category&status=out-of-stock&page=99");
    await expect(page).toHaveURL(/page=3/);
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
    const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    try {
      db.exec("UPDATE item SET isActive=0 WHERE id IN ('page254-21','page254-22','page254-23')");
      await page.reload();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByText("Showing 11 to 20 of 20 results", { exact: true })).toBeVisible();
    } finally { db.exec("UPDATE item SET isActive=1 WHERE id LIKE 'page254-%'"); db.close(); }
  });
}

test("empty catalog keeps keyboard controls accessible at 320px", async ({ page }, testInfo) => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  const ids = db.prepare("SELECT id FROM item WHERE isActive=1").all() as { id: string }[];
  try {
    db.exec("UPDATE item SET isActive=0 WHERE isActive=1");
    await page.setViewportSize({ width: 320, height: 800 });
    await ready(page, "/inventory?page=42");
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(page.getByText("No active Items.", { exact: true })).toBeVisible();
    await expect(page.getByText("No results", { exact: true })).toBeVisible();
    const category = page.getByRole("combobox", { name: "Category", exact: true });
    await category.focus();
    await category.press("Enter");
    await expect(page.getByRole("option", { name: "All Categories", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
    await capture(page, testInfo, "empty-320.png");
  } finally {
    const restore = db.prepare("UPDATE item SET isActive=1 WHERE id=?");
    for (const { id } of ids) restore.run(id);
    db.close();
  }
});
