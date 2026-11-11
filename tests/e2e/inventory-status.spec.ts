import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { chooseCatalogFilter, closeCatalogFilters, openCatalogFilters, resetCatalogFilters } from "./catalog-filter-helpers";
import { postFixtureSignIn } from "./fixture-auth";

let otherActiveItems: { id: string }[] = [];

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    // Keep catalog-wide totals independent of fixtures from other specs.
    otherActiveItems = db.prepare("SELECT id FROM item WHERE isActive=1").all() as { id: string }[];
    db.exec("UPDATE item SET isActive=0 WHERE isActive=1");
    db.exec(`
      INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('status-vendor','Status Vendor','status vendor',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('status-po','STATUS-PO','status-po','status-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate) VALUES ('status-receipt','status-po','status-vendor','Status Vendor','STATUS-PO','STATUS-INITIAL','status-initial',CURRENT_TIMESTAMP);
    `);
    const insertItem = db.prepare(`INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?, ?, ?, 'default-category-staples-dry-goods','default-unit-piece',?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
    const insertLine = db.prepare(`INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES (?, 'status-receipt',?,'default-unit-piece','default-unit-piece',?,'Piece','Piece',?,'1',?)`);
    const insertMovement = db.prepare(`INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?, ?, ?, 'default-unit-piece',?,'stock-in',CURRENT_TIMESTAMP)`);
    for (const [id, name, level, quantity] of [
      ["status-good", "Status Good Item", "10", "20"],
      ["status-reorder", "Status Reorder Item", "10", "10"],
      ["status-out", "Status Empty Item", "10", "0"],
      ["status-review", "Status Review Item", "invalid", "0"],
    ]) {
      insertItem.run(id, name, name.toLowerCase(), level);
      if (quantity !== "0") {
        insertLine.run(`${id}-line`, id, name, quantity, quantity);
        insertMovement.run(`${id}-movement`, `${id}-line`, id, quantity);
      }
    }
  } finally { db.close(); }
});

for (const width of [1280, 320]) {
  test(`Stock status filters and clears at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
    await page.goto("/inventory");
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    const list = page.locator(width === 320 ? "[data-inventory-mobile]" : "[data-inventory-desktop]");
    await expect(list.locator('[data-item-id="status-review"]')).toContainText("Review required");
    const overview = page.getByRole("region", { name: "Stock overview" });
    async function expectOverviewCounts() {
      const cards = overview.locator('[data-slot="card"]');
      // Four active fixtures, including the review item. Only the empty and low-stock items need restocking.
      await expect(cards.filter({ hasText: "Items tracked" })).toHaveText("Items tracked 4", { useInnerText: true });
      await expect(cards.filter({ hasText: "Good stock" })).toHaveText("Good stock 1", { useInnerText: true });
      await expect(overview.getByText("2 need restocking", { exact: true })).toBeVisible();
      await expect(overview.getByRole("button", { name: "1 out of stock", exact: true })).toBeVisible();
      await expect(overview.getByRole("button", { name: "1 reorder now", exact: true })).toBeVisible();
    }

    await expectOverviewCounts();
    const search = page.getByRole("searchbox", { name: "Search Inventory by Item name" });
    await search.fill("Status Review Item");
    await expect(list.locator('[data-item-id^="status-"]')).toHaveCount(1);
    await expectOverviewCounts();
    for (const [name, status, itemId, label] of [
      ["1 out of stock", "out-of-stock", "status-out", "Out of stock"],
      ["1 reorder now", "reorder-now", "status-reorder", "Reorder now"],
    ] as const) {
      await overview.getByRole("button", { name, exact: true }).click();
      await expect(page).toHaveURL(`/inventory?status=${status}`);
      await expect(search).toHaveValue("");
      await expect(list.locator(`[data-item-id="${itemId}"]`)).toBeVisible();
      await expect(list.locator('[data-item-id^="status-"]')).toHaveCount(1);
      await expect(page.getByText(`Showing items marked “${label}”.`, { exact: false })).toBeFocused();
      await expectOverviewCounts();
    }
    await resetCatalogFilters(page);
    await openCatalogFilters(page);
    const filter = page.getByRole("combobox", { name: "Stock status", exact: true });
    await expect(filter).toContainText("All stock statuses");
    if (width === 1280) {
      const category = await page.getByRole("combobox", { name: "Category", exact: true }).boundingBox();
      const status = await filter.boundingBox();
      expect(category).not.toBeNull();
      expect(status).not.toBeNull();
      expect(Math.abs(category!.y + category!.height - status!.y - status!.height)).toBeLessThanOrEqual(1);
    }
    await closeCatalogFilters(page);
    for (const [label, itemId] of [["Good", "status-good"], ["Reorder now", "status-reorder"], ["Out of stock", "status-out"]]) {
      await chooseCatalogFilter(page, "Stock status", label);
      await expect(list.locator(`[data-item-id="${itemId}"]`)).toBeVisible();
      await expect(list.locator('[data-item-id^="status-"]')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const evidence = process.env.MASANAO_INVENTORY_EVIDENCE_DIR;
      if (evidence) mkdirSync(evidence, { recursive: true });
      await page.screenshot({ path: evidence ? join(evidence, `status-${itemId}-${width}.png`) : testInfo.outputPath(`status-${itemId}-${width}.png`), fullPage: true });
    }
    await resetCatalogFilters(page);
    await expect(list.locator('[data-item-id^="status-"]')).toHaveCount(4);
    // Choosing all statuses also restores the full list.
    await chooseCatalogFilter(page, "Stock status", "Good");
    await chooseCatalogFilter(page, "Stock status", "All stock statuses");
    await expect(list.locator('[data-item-id^="status-"]')).toHaveCount(4);
  });
}

test("fresh reads use edited levels and posted stock, and no-match can be cleared", async ({ page }) => {
  test.setTimeout(120_000);
  expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    // Simulate a persisted level edit; the next server read must calculate again.
    db.prepare("UPDATE item SET reorderLevel='20' WHERE id='status-good'").run();
    await page.goto("/inventory");
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    const overview = page.getByRole("region", { name: "Stock overview" });
    await expect(overview.getByText("3 need restocking", { exact: true })).toBeVisible();
    await chooseCatalogFilter(page, "Stock status", "Good");
    await expect(page.getByText("No matching Items.", { exact: true })).toBeVisible();
    await expect(page.getByText("Try changing or clearing the filters.", { exact: true })).toBeVisible();
    await resetCatalogFilters(page);
    await expect(page.locator('[data-inventory-desktop] [data-item-id="status-good"]')).toContainText("Reorder now");
    await page.goto("/purchase-orders/status-po/record-delivery");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.getByRole("textbox", { name: "Receipt number", exact: true }).fill("STATUS-NEW");
    await page.getByRole("combobox", { name: "Item", exact: true }).fill("Status Empty Item");
    await page.getByRole("option", { name: "Status Empty Item", exact: true }).click();
    await page.getByLabel("Quantity", { exact: true }).fill("20");
    await page.getByLabel("Unit price", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Post delivery", exact: true }).click();
    await expect(page).toHaveURL(/\/purchase-orders\/status-po#delivery-receipt-/, { timeout: 30_000 });
    await page.goto("/inventory");
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    await expect(overview.getByText("2 need restocking", { exact: true })).toBeVisible();
    await expect(overview.getByRole("button", { name: "0 out of stock", exact: true })).toBeDisabled();
    await chooseCatalogFilter(page, "Stock status", "Good");
    await expect(page.locator('[data-inventory-desktop] [data-item-id="status-out"]')).toContainText("20 pc");
    await chooseCatalogFilter(page, "Stock status", "Out of stock");
    await expect(page.locator('[data-item-id="status-out"]')).toHaveCount(0);
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    const restore = db.prepare("UPDATE item SET isActive=1 WHERE id=?");
    for (const { id } of otherActiveItems) restore.run(id);
    db.exec(`DELETE FROM inventory_ledger_movement WHERE itemId LIKE 'status-%';
      DELETE FROM delivery_receipt_line WHERE itemId LIKE 'status-%';
      DELETE FROM delivery_receipt WHERE purchaseOrderId='status-po';
      DELETE FROM purchase_order WHERE id='status-po';
      DELETE FROM vendor WHERE id='status-vendor';
      DELETE FROM item WHERE id LIKE 'status-%';`);
  } finally { db.close(); }
});
