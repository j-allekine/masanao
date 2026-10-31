import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { closeCatalogFilters, openCatalogFilters } from "./catalog-filter-helpers";

test.use({ actionTimeout: 30_000 });

const mealPath = "/activity-designs/refresh255-design/activities/refresh255-activity/meal-schedules/refresh255-meal";

function setReceivedQuantity(db: Database.Database, id: string, quantity: string) {
  // Simulate a separately committed receiving snapshot without an app stock editor.
  db.transaction(() => {
    db.prepare("UPDATE delivery_receipt_line SET enteredQuantity=?, calculatedBaseUnitQuantity=? WHERE id=?").run(quantity, quantity, id);
    db.prepare("UPDATE inventory_ledger_movement SET quantity=? WHERE id=?").run(quantity, id);
  })();
}
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('refresh255-design','AD-REFRESH255',2026,'Inventory training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('refresh255-activity','refresh255-design','Inventory preparation','Kitchen',CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('refresh255-meal','refresh255-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('refresh255-eggs','Refresh Eggs','refresh eggs','default-category-staples-dry-goods','default-unit-piece','10',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ('refresh255-never','Refresh Never Received','refresh never received','default-category-staples-dry-goods','default-unit-piece','5',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP), ('refresh255-inactive','Refresh Inactive','refresh inactive','default-category-staples-dry-goods','default-unit-piece','5',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt) VALUES ('refresh255-tray','Refresh Tray','refresh tray','tray','invtray',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item_unit_conversion (id,itemId,alternateUnitId,baseUnitQuantity,createdAt,updatedAt) VALUES ('refresh255-conversion','refresh255-eggs','refresh255-tray','10',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('refresh255-vendor','Refresh Vendor','refresh vendor',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('refresh255-po','REFRESH255-PO','refresh255-po','refresh255-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
});

test("returning through browser history sees posted receiving, unchanged drafts, posted issuance and Item edits", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/inventory");
  const eggs = page.getByRole("row").filter({ hasText: "Refresh Eggs" });
  await expect(eggs).toContainText("Out of stock");
  await expect(eggs).toContainText("0 pc");
  await expect(page.getByRole("row").filter({ hasText: "Refresh Never Received" })).toContainText("Out of stock");
  await expect(page.getByText("Refresh Inactive", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Inventory", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Purchase Orders", exact: true }).click();
  await page.getByRole("link", { name: "REFRESH255-PO", exact: true }).click();
  await page.getByRole("link", { name: "Record delivery", exact: true }).click();
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Receipt number", { exact: true }).fill("REFRESH255-DR");
  await page.getByRole("combobox", { name: "Item", exact: true }).fill("Refresh Eggs");
  await page.getByRole("option", { name: "Refresh Eggs", exact: true }).click();
  await page.getByRole("combobox", { name: "Unit", exact: true }).click();
  await page.getByRole("option", { name: "Refresh Tray (10 pc)", exact: true }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Unit price", { exact: true }).fill("1");
  await expect(page.getByLabel("Calculated Base Unit quantity", { exact: true })).toHaveText("20 pc");
  await page.screenshot({ path: testInfo.outputPath("receiving-conversion.png"), fullPage: true });
  await page.getByRole("button", { name: "Post delivery", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/refresh255-po#delivery-receipt-/, { timeout: 30_000 });
  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await expect(eggs).toContainText("20 pc");
  await expect(eggs).toContainText("Good");
  await page.goto(mealPath);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Stock item" });
  await picker.getByRole("combobox", { name: "Item", exact: true }).fill("Refresh Eggs");
  await page.getByRole("option", { name: "Refresh Eggs", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("10");
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await expect(eggs).toContainText("20 pc");
  await page.goBack();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Post issuance", exact: true }).click();
  await page.getByRole("dialog", { name: "Post issuance?", exact: true }).getByRole("button", { name: "Confirm and post issuance" }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  await page.screenshot({ path: testInfo.outputPath("issuance-posted.png"), fullPage: true });
  await page.goForward();
  await expect(eggs).toContainText("10 pc");
  await expect(eggs).toContainText("Reorder now");
  await page.getByRole("link", { name: "Items", exact: true }).click();
  await page.getByRole("button", { name: "Actions for Refresh Eggs", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Reorder level").fill("5");
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(edit).toBeHidden();
  await page.goBack();
  await expect(eggs).toContainText("Good");
  await expect(eggs).toContainText("5 pc");
  await page.goForward();
  await page.getByRole("button", { name: "Actions for Refresh Eggs", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await expect(edit.getByLabel("Reorder level")).toHaveValue("5");
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(eggs).toContainText("Good");
  const evidence = process.env.MASANAO_INVENTORY_REFRESH_EVIDENCE_DIR;
  if (evidence) mkdirSync(evidence, { recursive: true });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const item = eggs;
    await expect(item).toContainText("10 pc");
    await expect(item).toContainText("Good");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: evidence ? join(evidence, `inventory-${width}.png`) : testInfo.outputPath(`inventory-${width}.png`), fullPage: true, style: "nextjs-portal { display: none !important; }" });
  }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    for (const table of ["issuance_receipt_allocation", "inventory_ledger_movement", "issuance_item_total", "issuance_stock_item", "issuance_record", "delivery_receipt_line", "delivery_receipt", "purchase_order", "vendor", "item_unit_conversion", "item", "unit", "meal_schedule", "activity", "activity_design"]) {
      // Every referenced child is removed before its fixture-owned parent.
      if (table === "issuance_receipt_allocation") db.exec("DELETE FROM issuance_receipt_allocation WHERE issuanceItemTotalId IN (SELECT id FROM issuance_item_total WHERE itemId LIKE 'refresh255-%')");
      else if (["inventory_ledger_movement", "issuance_item_total", "issuance_stock_item", "delivery_receipt_line"].includes(table)) db.exec(`DELETE FROM ${table} WHERE itemId LIKE 'refresh255-%'`);
      else if (table === "delivery_receipt") db.exec("DELETE FROM delivery_receipt WHERE purchaseOrderId='refresh255-po'");
      else if (table === "issuance_record") db.exec("DELETE FROM issuance_record WHERE mealScheduleId='refresh255-meal'");
      else db.exec(`DELETE FROM ${table} WHERE id LIKE 'refresh255-%'`);
    }
  } finally { db.close(); }
});


for (const width of [1280, 320]) {
  test(`Refresh retains filters and valid page, updates stock and clamps a shrinking result at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    const prefix = `refresh255-${width}`;
    try {
      db.prepare(`INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,'refresh255-po','refresh255-vendor','Refresh Vendor','REFRESH255-PO',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(prefix, prefix, prefix);
      const insertItem = db.prepare(`INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?,?,?,'default-category-staples-dry-goods','default-unit-piece','2',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
      const insertLine = db.prepare(`INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES (?,?,?,'default-unit-piece','default-unit-piece',?,'Piece','Piece','10','1','10')`);
      const insertMovement = db.prepare(`INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,?,'default-unit-piece','10','stock-in',CURRENT_TIMESTAMP)`);
      for (let index = 1; index <= 23; index++) {
        const number = String(index).padStart(2, "0");
        const id = `${prefix}-${number}`;
        const name = `Refresh Pantry ${width} ${number}`;
        insertItem.run(id, name, name.toLowerCase());
        insertLine.run(id, prefix, id, name);
        insertMovement.run(id, id, id);
      }
      expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
      await page.setViewportSize({ width, height: 800 });
      const url = `/inventory?q=Refresh+Pantry+${width}&category=default-category-staples-dry-goods&status=good&page=3`;
      const entryRefresh = page.waitForResponse((response) => response.url().includes("/inventory?") && response.request().headers()["rsc"] === "1");
      await page.goto(url);
      await entryRefresh;
      await expect(page.getByText("Showing 21 to 23 of 23 results", { exact: true })).toBeVisible();
      const list = page.getByRole("table", { name: "Inventory", exact: true });
      const last = list.locator(`[data-item-id="${prefix}-23"]`);
      await expect(last).toContainText("10 pc");
      setReceivedQuantity(db, `${prefix}-23`, "7");
      await expect(last).toContainText("10 pc");
      const refresh = page.getByRole("button", { name: "Refresh", exact: true });
      await refresh.focus();
      await expect(refresh).toBeFocused();
      await refresh.press("Enter");
      await expect(last).toContainText("7 pc");
      await expect(page).toHaveURL(new RegExp(url.replaceAll("?", "\\?" ).replaceAll("+", "\\+")));
      await expect(page.getByRole("searchbox", { name: "Search Inventory by Item name" })).toHaveValue(`Refresh Pantry ${width}`);
      await openCatalogFilters(page);
      await expect(page.getByRole("combobox", { name: "Category", exact: true })).toContainText("Staples");
      await expect(page.getByRole("combobox", { name: "Stock status", exact: true })).toContainText("Good");
      await closeCatalogFilters(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const evidence = process.env.MASANAO_INVENTORY_REFRESH_EVIDENCE_DIR;
      if (evidence) mkdirSync(evidence, { recursive: true });
      await page.screenshot({ path: evidence ? join(evidence, `refresh-page3-${width}.png`) : testInfo.outputPath(`refresh-page3-${width}.png`), fullPage: true, style: "nextjs-portal { display: none !important; }" });
      await page.getByRole("button", { name: "Previous page", exact: true }).click();
      await expect(page).toHaveURL(/page=2/);
      setReceivedQuantity(db, `${prefix}-11`, "9");
      await page.goBack();
      await expect(page).toHaveURL(/page=3/);
      await page.goForward();
      await expect(list.locator(`[data-item-id="${prefix}-11"]`)).toContainText("9 pc");
      // A browser restoring the document from its BFCache emits persisted pageshow.
      setReceivedQuantity(db, `${prefix}-11`, "8");
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
      await expect(list.locator(`[data-item-id="${prefix}-11"]`)).toContainText("8 pc");
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(page).toHaveURL(/page=3/);
      db.prepare("UPDATE item SET isActive=0 WHERE id IN (?,?,?)").run(`${prefix}-21`, `${prefix}-22`, `${prefix}-23`);
      await refresh.click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByText("Showing 11 to 20 of 20 results", { exact: true })).toBeVisible();
      await expect(page.getByRole("searchbox", { name: "Search Inventory by Item name" })).toHaveValue(`Refresh Pantry ${width}`);
      await openCatalogFilters(page);
      await expect(page.getByRole("combobox", { name: "Stock status", exact: true })).toContainText("Good");
      await closeCatalogFilters(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: evidence ? join(evidence, `refresh-clamped-${width}.png`) : testInfo.outputPath(`refresh-clamped-${width}.png`), fullPage: true, style: "nextjs-portal { display: none !important; }" });
    } finally { db.close(); }
  });
}
