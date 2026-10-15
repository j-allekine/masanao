import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

const path = "/activity-designs/fifo-design/activities/fifo-activity/meal-schedules/fifo-meal/issuance";
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('fifo-design','AD-FIFO',2026,'FIFO training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('fifo-activity','fifo-design','FIFO preparation','Kitchen',CURRENT_TIMESTAMP,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('fifo-meal','fifo-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,isActive,issuanceQuantityPolicy,createdAt,updatedAt) VALUES ('fifo-rice','FIFO Rice','fifo rice','default-category-staples-dry-goods','default-unit-kilogram',1,'allow-decimals',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('fifo-vendor','FIFO Supplier','fifo supplier',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  for (const [id, date, quantity] of [["older", "2026-10-01", "10"], ["newer", "2026-10-02", "20"]]) {
    db.prepare("INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,'fifo-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`fifo-po-${id}`, `FIFO-PO-${id}`, `fifo-po-${id}`);
    db.prepare("INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,?,'fifo-vendor','FIFO Supplier',?,?,?,?,CURRENT_TIMESTAMP)").run(`fifo-dr-${id}`, `fifo-po-${id}`, `FIFO-PO-${id}`, `FIFO-DR-${id}`, `fifo-dr-${id}`, date);
    db.prepare("INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES (?,?,'fifo-rice','default-unit-kilogram','default-unit-kilogram','FIFO Rice','Kilogram','Kilogram',?,'1',?)").run(`fifo-line-${id}`, `fifo-dr-${id}`, quantity, quantity);
    db.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,'fifo-rice','default-unit-kilogram',?,'stock-in',CURRENT_TIMESTAMP)").run(`fifo-in-${id}`, `fifo-line-${id}`, quantity);
  }
  db.close();
});

test("posted FIFO sources split across POs and remain accessible and immutable", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto(path);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Stock item" });
  await picker.getByRole("combobox", { name: "Item", exact: true }).fill("FIFO Rice");
  await page.getByRole("option", { name: "FIFO Rice", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("15.25");
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("button", { name: "Post issuance", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Post issuance?", exact: true });
  await expect(confirm).toContainText("oldest receipt stock first (FIFO)");
  await confirm.getByRole("button", { name: "Confirm and post issuance" }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  const opener = page.getByRole("button", { name: "Receipt sources · FIFO", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  const sources = page.getByRole("dialog", { name: "Receipt sources for FIFO Rice" });
  await expect(sources.getByRole("row").filter({ hasText: "FIFO-DR-older" })).toContainText("10 kg");
  await expect(sources.getByRole("row").filter({ hasText: "FIFO-DR-newer" })).toContainText("5.25 kg");
  await page.screenshot({ path: testInfo.outputPath("fifo-receipt-sources-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(sources.getByRole("list", { name: "Receipt allocations" }).getByText("FIFO-PO-older", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("fifo-receipt-sources-mobile.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  expect(db.prepare("SELECT a.quantity FROM issuance_receipt_allocation a JOIN issuance_item_total t ON t.id=a.issuanceItemTotalId WHERE t.itemId='fifo-rice' ORDER BY a.receiptDate").all()).toEqual([{ quantity: "10" }, { quantity: "5.25" }]);
  db.prepare("UPDATE purchase_order SET purchaseOrderNo='Changed document' WHERE id='fifo-po-older'").run();
  db.close();
  await page.reload();
  await page.getByRole("button", { name: "Receipt sources · FIFO", exact: true }).click();
  await expect(sources.getByRole("list", { name: "Receipt allocations" }).getByText("FIFO-PO-older", { exact: true })).toBeVisible();
});
