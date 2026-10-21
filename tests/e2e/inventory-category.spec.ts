import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec(`
      INSERT INTO category (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('invcat-archived','Archived pantry','archived pantry',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('invcat-rice','Category Rice','category rice','invcat-archived','default-unit-kilogram','0.1',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),('invcat-hidden','Category Hidden','category hidden','invcat-archived','default-unit-kilogram','1',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('invcat-vendor','Category Vendor','category vendor',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('invcat-po','INVCAT-PO','invcat-po','invcat-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES ('invcat-dr','invcat-po','invcat-vendor','Category Vendor','INVCAT-PO','INVCAT-DR','invcat-dr',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES ('invcat-line','invcat-dr','invcat-rice','default-unit-kilogram','default-unit-kilogram','Category Rice','Kilogram','Kilogram','0.123456789','1','0.123456789');
      INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('invcat-in','invcat-line','invcat-rice','default-unit-kilogram','0.123456789','stock-in',CURRENT_TIMESTAMP);
    `);
  } finally { db.close(); }
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/inventory");
  await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
});

test("Category keeps exact balances for active Items in an inactive Category and clears on desktop and mobile", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const evidence = process.env.MASANAO_INVENTORY_CATEGORY_EVIDENCE_DIR;
  if (evidence) mkdirSync(evidence, { recursive: true });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const scope = width === 320 ? page.locator("[data-inventory-mobile]") : page.locator("[data-inventory-desktop]");
    const originalCount = await scope.locator("[data-item-id]").count();
    expect(originalCount).toBeGreaterThan(1);
    const filter = page.getByRole("combobox", { name: "Category", exact: true });
    await expect(filter).toContainText("All Categories");
    await expect(filter).toBeEnabled();
    await filter.focus();
    await expect(filter).toBeFocused();
    await filter.press("Enter");
    await expect(page.getByRole("option", { name: "Archived pantry", exact: true })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
    await expect(scope.locator("[data-item-id]")).toHaveCount(1);
    const rice = scope.locator('[data-item-id="invcat-rice"]');
    await expect(rice).toContainText("0.123456789 kg");
    await expect(rice).toContainText("0.1 kg");
    await expect(rice).toContainText("Good");
    await expect(page.getByText("Category Hidden", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: evidence ? join(evidence, `category-${width}.png`) : testInfo.outputPath(`category-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Clear Category", exact: true }).click();
    await expect(filter).toContainText("All Categories");
    await expect(scope.locator("[data-item-id]")).toHaveCount(originalCount);
  }
});

test("empty catalog remains clear and Category control stays usable on mobile", async ({ page }, testInfo) => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  const activeIds = db.prepare("SELECT id FROM item WHERE isActive=1").all() as { id: string }[];
  try {
    db.exec("UPDATE item SET isActive=0 WHERE isActive=1");
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    await expect(page.getByText("No active Items.", { exact: true })).toBeVisible();
    const filter = page.getByRole("combobox", { name: "Category", exact: true });
    await expect(filter).toBeEnabled();
    await filter.focus();
    await expect(filter).toBeFocused();
    await filter.press("Enter");
    await expect(page.getByRole("option", { name: "All Categories", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="select-content"]')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const evidence = process.env.MASANAO_INVENTORY_CATEGORY_EVIDENCE_DIR;
    if (evidence) mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: evidence ? join(evidence, "category-empty-320.png") : testInfo.outputPath("category-empty-320.png"), fullPage: true });
  } finally {
    const restore = db.prepare("UPDATE item SET isActive=1 WHERE id=?");
    for (const { id } of activeIds) restore.run(id);
    db.close();
  }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    for (const table of ["inventory_ledger_movement", "delivery_receipt_line", "delivery_receipt", "purchase_order", "vendor", "item", "category"]) db.exec(`DELETE FROM ${table} WHERE id LIKE 'invcat-%'`);
  } finally { db.close(); }
});
