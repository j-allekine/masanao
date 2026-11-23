import Database from "better-sqlite3";
import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./fixture";
import { postFixtureSignIn } from "../e2e/fixture-auth";

const itemName = "Saved evidence rice";
const database = () => new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
test.beforeEach(() => {
  const db = database();
  db.exec(`
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('evidence-rice','${itemName}','saved evidence rice','default-category-staples-dry-goods','default-unit-kilogram','1',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt) VALUES ('evidence-sack','Evidence Sack','evidence sack','es','es',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item_unit_conversion (id,itemId,alternateUnitId,baseUnitQuantity,createdAt,updatedAt) VALUES ('evidence-conversion','evidence-rice','evidence-sack','25',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
});
async function start(page: Page) {
  expect((await postFixtureSignIn(page.request, { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/inventory/opening-stock");
  await page.getByRole("button", { name: "Start opening stock", exact: true }).click();
  await page.getByRole("button", { name: "Add items", exact: true }).click();
  await page.getByRole("dialog", { name: "Add items", exact: true }).getByRole("button", { name: new RegExp(`^${itemName} `) }).click();
}
const quantity = (page: Page) => page.getByLabel(`Quantity for ${itemName}`, { exact: true }).filter({ visible: true });
const cost = (page: Page) => page.getByLabel(`Opening unit cost for ${itemName}`, { exact: true }).filter({ visible: true });
const unit = (page: Page) => page.getByRole("combobox", { name: `Unit for ${itemName}`, exact: true }).filter({ visible: true });
async function saveReload(page: Page) {
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await page.reload();
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
}
async function preview(page: Page, width: number, stock: string, amount: string) {
  if (width >= 768) {
    const row = page.getByRole("table", { name: "Opening Stock count", exact: true }).getByRole("row").filter({ hasText: itemName });
    await expect(row.getByRole("cell").nth(3)).toHaveText(stock);
    await expect(row.getByRole("cell").nth(5)).toHaveText(amount);
  } else {
    const card = page.locator('[data-slot="card"]').filter({ hasText: itemName }).filter({ visible: true });
    await expect(card.getByText(`Equivalent stock: ${stock}`, { exact: true })).toBeVisible();
    await expect(card.getByText(amount, { exact: true })).toBeVisible();
  }
}
async function evidence(scope: Page | Locator, width: number, stock: string, amount: string) {
  if (width >= 768) {
    const row = scope.getByRole("table", { name: "Opening Stock quantities and costs", exact: true }).getByRole("row").filter({ hasText: itemName });
    await expect(row.getByRole("cell").nth(2)).toHaveText(stock);
    await expect(row.getByRole("cell").nth(4)).toHaveText(amount);
  } else {
    const dl = scope.locator("dl").filter({ hasText: "Equivalent stock" }).filter({ visible: true });
    await expect(dl.locator("dd").nth(1)).toHaveText(stock);
    await expect(dl.locator("dd").nth(3)).toHaveText(amount);
  }
}
for (const width of [1440, 320]) test(`reopened quantity, selected unit and cost edits match live, reviewed and posted evidence at ${width}px`, async ({ page }, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width, height: 960 });
  await start(page);
  await quantity(page).fill("10"); await cost(page).fill("2");
  await saveReload(page);
  await quantity(page).fill("20"); await cost(page).fill("3");
  await preview(page, width, "20 kg", "₱60");
  await page.getByRole("button", { name: "Review opening stock", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review opening stock", exact: true });
  await evidence(review, width, "20 kg", "₱60");
  await review.getByRole("button", { name: "Back to count", exact: true }).click();
  await unit(page).click(); await page.getByRole("option", { name: "Evidence Sack (25 kg)", exact: true }).click();
  await quantity(page).fill("2"); await cost(page).fill("10");
  await preview(page, width, "50 kg", "₱20");
  await page.getByRole("button", { name: "Review opening stock", exact: true }).click();
  await evidence(review, width, "50 kg", "₱20");
  await expect(review.getByText("1 es = 25 kg", { exact: true }).filter({ visible: true })).toBeVisible();
  expect(await review.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`edited-review-${width}.png`), fullPage: true });
  await review.getByRole("button", { name: "Post opening stock", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Original counted quantities", exact: true })).toBeVisible();
  await evidence(page, width, "50 kg", "₱20");
  const db = database();
  expect(db.prepare("SELECT quantity,amount FROM opening_stock_source").get()).toEqual({ quantity: "50", amount: "20" });
  expect(db.prepare("SELECT quantity FROM inventory_ledger_movement").get()).toEqual({ quantity: "50" });
  db.close();
});
test("reselecting the saved unit retains its reviewed factor and labels when the catalog changes", async ({ page }) => {
  test.setTimeout(180_000);
  await start(page);
  await unit(page).click(); await page.getByRole("option", { name: "Evidence Sack (25 kg)", exact: true }).click();
  await quantity(page).fill("2"); await cost(page).fill("10");
  await saveReload(page);
  const db = database();
  db.exec("UPDATE item_unit_conversion SET baseUnitQuantity='30' WHERE id='evidence-conversion'; UPDATE unit SET name='Changed Sack', abbreviation='changed' WHERE id='evidence-sack';");
  db.close();
  await page.reload();
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
  await expect(unit(page)).toContainText("Evidence Sack (25 kg)");
  await preview(page, 1440, "50 kg", "₱20");
  await unit(page).click(); await page.getByRole("option", { name: "kg", exact: true }).click();
  await unit(page).click();
  await page.getByRole("option", { name: "Evidence Sack (25 kg)", exact: true }).click();
  await preview(page, 1440, "50 kg", "₱20");
  await page.getByRole("button", { name: "Review opening stock", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review opening stock", exact: true });
  await evidence(review, 1440, "50 kg", "₱20");
  const saved = database();
  expect(saved.prepare("SELECT conversionFactor,calculatedBaseUnitQuantity FROM opening_stock_line").get()).toEqual({ conversionFactor: "25", calculatedBaseUnitQuantity: "50" });
  saved.close();
  await expect(review.getByText("1 es = 25 kg", { exact: true }).filter({ visible: true })).toBeVisible();
  await review.getByRole("button", { name: "Post opening stock", exact: true }).click();
  await expect(review.getByRole("alert")).toContainText("conversion changed");
  const unchanged = database(); expect(unchanged.prepare("SELECT COUNT(*) AS count FROM inventory_ledger_movement").get()).toEqual({ count: 0 }); unchanged.close();
  await review.getByRole("button", { name: "Back to count", exact: true }).click();
  await unit(page).click(); await page.getByRole("option", { name: "kg", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await unit(page).click(); await page.getByRole("option", { name: "Changed Sack (30 kg)", exact: true }).click();
  await preview(page, 1440, "60 kg", "₱20");
  await page.getByRole("button", { name: "Review opening stock", exact: true }).click();
  await evidence(review, 1440, "60 kg", "₱20");
  await expect(review.getByText("1 changed = 30 kg", { exact: true }).filter({ visible: true })).toBeVisible();
  await review.getByRole("button", { name: "Post opening stock", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Original counted quantities", exact: true })).toBeVisible();
  await evidence(page, 1440, "60 kg", "₱20");
  const posted = database(); expect(posted.prepare("SELECT quantity,amount FROM opening_stock_source").get()).toEqual({ quantity: "60", amount: "20" }); posted.close();
});
