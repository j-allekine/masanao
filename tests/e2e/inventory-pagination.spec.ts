import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { chooseCatalogFilter, closeCatalogFilters, openCatalogFilters, resetCatalogFilters } from "./catalog-filter-helpers";

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

test("long Inventory keeps navigation, actions and aligned column labels reachable", async ({ page }, info) => {
  test.setTimeout(120_000);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    const insert = db.prepare(`INSERT INTO item
      (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt)
      VALUES (?,?,?,'default-category-staples-dry-goods','default-unit-kilogram','2',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
    for (let index = 0; index < 10; index++) {
      const name = `Scroll sample ${index} Whole Wheat Macaroni for Municipal Workshop Meal Preparation and Staff Training`;
      insert.run(`layout-inventory-${index}`, name, name.toLowerCase());
    }

    const toggle = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
    const title = page.getByRole("heading", { name: "Inventory", level: 1, exact: true });
    const refresh = page.getByRole("button", { name: "Refresh", exact: true });
    const exportCsv = page.getByRole("button", { name: "Export CSV", exact: true });
    const table = page.getByRole("table", { name: "Inventory", exact: true });
    const labels = table.getByRole("row").filter({ has: page.getByRole("columnheader", { name: "On hand", exact: true }) });
    const search = page.getByRole("searchbox", { name: "Search Inventory by Item name" });
    for (const { width, height } of [
      { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 768, height: 1024 },
      { width: 390, height: 640 }, { width: 320, height: 640 }, { width: 320, height: 480 },
    ]) {
      await page.setViewportSize({ width, height });
      await ready(page, "/inventory?q=Scroll+sample");
      await expect(refresh).toBeEnabled();
      if (width === 768 || height === 480) {
        await page.addStyleTag({ content: "html { font-size: 125%; } body { letter-spacing: .02em; }" });
      }
      const desktop = width >= 640;
      const result = desktop ? table.getByRole("row").last() : page.locator('[data-inventory-mobile] [data-item-id]').last();
      await expect(result).toContainText("0 kg");
      await expect(result).toContainText("Out of stock");
      await expect(toggle).toHaveCount(1);
      await expect(title).toBeInViewport();
      const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect(maxScroll, `${width}×${height} must overflow`).toBeGreaterThan(100);
      for (const offset of [Math.floor(maxScroll / 2), maxScroll]) {
        await page.evaluate((top) => window.scrollTo(0, top), offset);
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(offset - 1);
        await expect(toggle).toBeInViewport({ ratio: 1 });
        await expect(title).toBeInViewport({ ratio: 1 });
        await expect(refresh).toBeInViewport({ ratio: 1 });
        await expect(exportCsv).toBeInViewport({ ratio: 1 });
      }
      await expect(result).toBeInViewport();
      if (desktop) {
        await expect(labels).toBeInViewport();
        const header = table.getByRole("columnheader", { name: "On hand", exact: true });
        const cell = result.getByRole("cell", { name: "0 kg", exact: true });
        if (width === 1024 || width === 768) {
          expect(await table.evaluate((element) => {
            const scroller = element.parentElement!;
            scroller.scrollLeft = scroller.scrollWidth;
            return scroller.scrollLeft;
          })).toBeGreaterThan(0);
        }
        await expect.poll(async () => Math.abs((await header.boundingBox())!.x - (await cell.boundingBox())!.x)).toBeLessThan(1);
        expect((await labels.boundingBox())!.y).toBeGreaterThanOrEqual((await title.boundingBox())!.y + (await title.boundingBox())!.height - 1);
      } else {
        await expect(table).toHaveCount(0);
      }
      await page.screenshot({ path: info.outputPath(`inventory-scrolled-${width}x${height}.png`) });

      if (height === 480) {
        const scrollBefore = await page.evaluate(() => scrollY);
        await toggle.focus();
        await page.keyboard.press("Enter");
        const sidebar = page.getByRole("dialog", { name: "Sidebar", exact: true });
        await expect(sidebar).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(sidebar).toBeHidden();
        await expect(toggle).toBeFocused();
        expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
      }
      await search.focus();
      await expect(search).toBeFocused();
      await expect.poll(async () => (await search.boundingBox())!.y - (await title.boundingBox())!.y).toBeGreaterThan(20);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally {
    db.exec("DELETE FROM item WHERE id LIKE 'layout-inventory-%'");
    db.close();
  }
});

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
    await openCatalogFilters(page);
    await category.focus();
    await category.press("Enter");
    await page.getByRole("option", { name: "Archived pantry", exact: true }).click();
    await closeCatalogFilters(page);
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    await chooseCatalogFilter(page, "Stock status", "Out of stock");
    await expect(page).toHaveURL(/status=out-of-stock/);
    await expect(search).toHaveValue("Pagination");
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Page 3 of 3", exact: true }).click();
    await expect(list.locator("[data-item-id]")).toHaveCount(3);
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
    await openCatalogFilters(page);
    const categoryBox = await category.boundingBox();
    expect(categoryBox!.width).toBeGreaterThan(150);
    if (width === 1280) {
      const clearBox = await page.getByRole("search").getByRole("button", { name: "Reset", exact: true }).boundingBox();
      expect(clearBox!.x).toBeGreaterThanOrEqual(categoryBox!.x + categoryBox!.width);
    }
    await closeCatalogFilters(page);
    await capture(page, testInfo, `combined-page3-${width}.png`);
    if (width === 1280) {
      await page.setViewportSize({ width: 1024, height: 800 });
      await openCatalogFilters(page);
      expect((await category.boundingBox())!.width).toBeGreaterThan(150);
      await closeCatalogFilters(page);
      await capture(page, testInfo, "combined-page3-1024.png");
      await page.setViewportSize({ width, height: 800 });
    }
    const backRefresh = page.waitForResponse((response) => response.url().includes("/inventory?") && response.request().headers()["rsc"] === "1");
    await page.goBack();
    await (await backRefresh).finished();
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    const forwardRefresh = page.waitForResponse((response) => response.url().includes("/inventory?") && response.request().headers()["rsc"] === "1");
    await page.goForward();
    await (await forwardRefresh).finished();
    await expect(page).toHaveURL(/page=3/);
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh", exact: true })).toHaveAttribute("aria-busy", "false");
    await page.reload();
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    await expect(search).toHaveValue("Pagination");
    await openCatalogFilters(page);
    await expect(category).toContainText("Archived pantry");
    await closeCatalogFilters(page);
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
    await search.fill("Pagination Rice 01");
    await expect(page).not.toHaveURL(/page=/);
    await expect(list.locator("[data-item-id]")).toHaveCount(1);
    await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
    await search.press("Tab");
    await expect(page.getByRole("button", { name: "Clear search", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(search).toHaveValue("");
    await openCatalogFilters(page);
    await expect(category).toContainText("Archived pantry");
    await closeCatalogFilters(page);
    await expect(page).toHaveURL(/status=out-of-stock/);
    await chooseCatalogFilter(page, "Category", "All Categories");
    await expect(page).toHaveURL(/status=out-of-stock/);
    await search.fill("Pagination");
    await expect(page.getByText("Showing 1 to 10 of 27 results", { exact: true })).toBeVisible();
    await chooseCatalogFilter(page, "Category", "Archived pantry");
    await expect(page.getByText("Showing 1 to 10 of 23 results", { exact: true })).toBeVisible();
    await chooseCatalogFilter(page, "Stock status", "All stock statuses");
    await openCatalogFilters(page);
    await expect(category).toContainText("Archived pantry");
    await closeCatalogFilters(page);
    await expect(search).toHaveValue("Pagination");
    await search.fill("No such item");
    await expect(page.getByText("No matching Items.", { exact: true })).toBeVisible();
    await expect(page.getByText("No results", { exact: true })).toBeVisible();
    await capture(page, testInfo, `no-match-${width}.png`);
    await resetCatalogFilters(page);
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

test("initial page correction waits for stock refresh and preserves an open Filters dialog", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  let releaseRefresh!: () => void;
  const gate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
  await page.route("**/inventory?**", async (route) => {
    if (route.request().headers()["rsc"] === "1") await gate;
    await route.continue();
  });
  const requested = page.waitForRequest((request) => request.headers()["rsc"] === "1" && new URL(request.url()).pathname === "/inventory");
  try {
    await ready(page, "/inventory?q=Pagination&page=42");
    await requested;
    await expect(page.getByRole("button", { name: "Refreshing…", exact: true })).toBeVisible();
    // URL writes must wait even when the initial page needs correction.
    await expect(page).toHaveURL(/page=42/);
    await openCatalogFilters(page);
    releaseRefresh();
    await expect(page).toHaveURL(/page=3/);
    await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toBeVisible();
    await closeCatalogFilters(page);
    await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
    await expect(page.getByText("Showing 21 to 27 of 27 results", { exact: true })).toBeVisible();
  } finally {
    releaseRefresh();
  }
});

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
    await openCatalogFilters(page);
    await category.focus();
    await category.press("Enter");
    await expect(page.getByRole("option", { name: "All Categories", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
    await closeCatalogFilters(page);
    await capture(page, testInfo, "empty-320.png");
  } finally {
    const restore = db.prepare("UPDATE item SET isActive=1 WHERE id=?");
    for (const { id } of ids) restore.run(id);
    db.close();
  }
});
