import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const mealPath = "/activity-designs/inv-design/activities/inv-activity/meal-schedules/inv-meal";
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('inv-design','AD-INV',2026,'Inventory training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('inv-activity','inv-design','Inventory preparation','Kitchen',CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('inv-meal','inv-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('inv-eggs','Inventory Eggs','inventory eggs','default-category-staples-dry-goods','default-unit-piece','10',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ('inv-never','Inventory Never Received','inventory never received','default-category-staples-dry-goods','default-unit-piece','5',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ('inv-inactive','Inventory Inactive','inventory inactive','default-category-staples-dry-goods','default-unit-piece','5',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt) VALUES ('inv-tray','Inventory Tray','inventory tray','tray','invtray',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item_unit_conversion (id,itemId,alternateUnitId,baseUnitQuantity,createdAt,updatedAt) VALUES ('inv-conversion','inv-eggs','inv-tray','10',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('inv-vendor','Inventory Vendor','inventory vendor',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('inv-po','INV-PO','inv-po','inv-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
});

test("staff reads exact stock from converted receiving through draft and posted issuance on desktop and mobile", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/inventory");
  const eggs = page.getByRole("row").filter({ hasText: "Inventory Eggs" });
  await expect(eggs).toContainText("Out of stock");
  await expect(eggs).toContainText("0 pc");
  await expect(page.getByRole("row").filter({ hasText: "Inventory Never Received" })).toContainText("Out of stock");
  await expect(page.getByText("Inventory Inactive", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Inventory", exact: true })).toHaveAttribute("aria-current", "page");
  await page.goto("/purchase-orders/inv-po/record-delivery");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Receipt number", { exact: true }).fill("INV-DR");
  await page.getByRole("combobox", { name: "Item", exact: true }).fill("Inventory Eggs");
  await page.getByRole("option", { name: "Inventory Eggs", exact: true }).click();
  await page.getByRole("combobox", { name: "Unit", exact: true }).click();
  await page.getByRole("option", { name: "Inventory Tray (10 pc)", exact: true }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Unit price", { exact: true }).fill("1");
  await expect(page.getByLabel("Calculated Base Unit quantity", { exact: true })).toHaveText("20 pc");
  await page.screenshot({ path: testInfo.outputPath("receiving-conversion.png"), fullPage: true });
  await page.getByRole("button", { name: "Post delivery", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/inv-po#delivery-receipt-/, { timeout: 30_000 });
  await page.goto("/inventory");
  await expect(eggs).toContainText("20 pc");
  await expect(eggs).toContainText("Good");
  await page.goto(mealPath);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Stock item" });
  await picker.getByRole("combobox", { name: "Item", exact: true }).fill("Inventory Eggs");
  await page.getByRole("option", { name: "Inventory Eggs", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("10");
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.goto("/inventory");
  await expect(eggs).toContainText("20 pc");
  await page.goto(mealPath);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Post issuance", exact: true }).click();
  await page.getByRole("dialog", { name: "Post issuance?", exact: true }).getByRole("button", { name: "Confirm and post issuance" }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  await page.screenshot({ path: testInfo.outputPath("issuance-posted.png"), fullPage: true });
  await page.goto("/inventory");
  await expect(eggs).toContainText("10 pc");
  await expect(eggs).toContainText("Reorder now");
  const evidence = process.env.MASANAO_INVENTORY_EVIDENCE_DIR;
  if (evidence) mkdirSync(evidence, { recursive: true });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const item = width === 320 ? page.locator('[data-inventory-mobile] [data-item-id="inv-eggs"]') : eggs;
    await expect(item).toContainText("10 pc");
    await expect(item).toContainText("Reorder now");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: evidence ? join(evidence, `inventory-${width}.png`) : testInfo.outputPath(`inventory-${width}.png`), fullPage: true });
  }
  // A live session must lose Inventory access when its account becomes disabled.
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("UPDATE user SET disabled=1 WHERE username='kitchen.staff'").run();
    await page.goto("/inventory");
    await expect(page).toHaveURL(/\/$/);
    db.prepare("UPDATE user SET disabled=0 WHERE username='kitchen.staff'").run();
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("UPDATE user SET disabled=0 WHERE username='kitchen.staff'").run();
    for (const table of ["issuance_receipt_allocation", "inventory_ledger_movement", "issuance_item_total", "issuance_stock_item", "issuance_record", "delivery_receipt_line", "delivery_receipt", "purchase_order", "vendor", "item_unit_conversion", "item", "unit", "meal_schedule", "activity", "activity_design"]) {
      // Every referenced child is removed before its fixture-owned parent.
      if (table === "issuance_receipt_allocation") db.exec("DELETE FROM issuance_receipt_allocation WHERE issuanceItemTotalId IN (SELECT id FROM issuance_item_total WHERE itemId LIKE 'inv-%')");
      else if (["inventory_ledger_movement", "issuance_item_total", "issuance_stock_item", "delivery_receipt_line"].includes(table)) db.exec(`DELETE FROM ${table} WHERE itemId LIKE 'inv-%'`);
      else if (table === "delivery_receipt") db.exec("DELETE FROM delivery_receipt WHERE purchaseOrderId='inv-po'");
      else if (table === "issuance_record") db.exec("DELETE FROM issuance_record WHERE mealScheduleId='inv-meal'");
      else db.exec(`DELETE FROM ${table} WHERE id LIKE 'inv-%'`);
    }
  } finally { db.close(); }
});

