import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import type { IssuanceWorkspace } from "../../src/features/issuance/types";

const path = "/activity-designs/fifo-design/activities/fifo-activity/meal-schedules/fifo-meal";
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('fifo-design','AD-FIFO',2026,'FIFO training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('fifo-activity','fifo-design','FIFO preparation','Kitchen',CURRENT_TIMESTAMP,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('fifo-meal','fifo-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item (reorderLevel, id,name,normalizedName,categoryId,baseUnitId,isActive,issuanceQuantityPolicy,createdAt,updatedAt) VALUES (10, 'fifo-rice','FIFO Rice','fifo rice','default-category-staples-dry-goods','default-unit-kilogram',1,'allow-decimals',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item (reorderLevel, id,name,normalizedName,categoryId,baseUnitId,isActive,issuanceQuantityPolicy,createdAt,updatedAt) VALUES (10, 'fifo-salt','FIFO Salt','fifo salt','default-category-staples-dry-goods','default-unit-kilogram',1,'allow-decimals',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('fifo-vendor','FIFO Supplier','fifo supplier',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  for (const [id, date, quantity] of [["older", "2026-10-01", "10"], ["newer", "2026-10-02", "20"]]) {
    db.prepare("INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,'fifo-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`fifo-po-${id}`, `FIFO-PO-${id}`, `fifo-po-${id}`);
    db.prepare("INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,?,'fifo-vendor','FIFO Supplier',?,?,?,?,CURRENT_TIMESTAMP)").run(`fifo-dr-${id}`, `fifo-po-${id}`, `FIFO-PO-${id}`, `FIFO-DR-${id}`, `fifo-dr-${id}`, date);
    db.prepare("INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES (?,?,'fifo-rice','default-unit-kilogram','default-unit-kilogram','FIFO Rice','Kilogram','Kilogram',?,'1',?)").run(`fifo-line-${id}`, `fifo-dr-${id}`, quantity, quantity);
    db.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,'fifo-rice','default-unit-kilogram',?,'stock-in',CURRENT_TIMESTAMP)").run(`fifo-in-${id}`, `fifo-line-${id}`, quantity);
  }
  db.exec("INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES ('fifo-salt-line','fifo-dr-older','fifo-salt','default-unit-kilogram','default-unit-kilogram','FIFO Salt','Kilogram','Kilogram','5','1','5'); INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('fifo-salt-in','fifo-salt-line','fifo-salt','default-unit-kilogram','5','stock-in',CURRENT_TIMESTAMP)");
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
  await expect(picker.getByRole("status")).toContainText("FIFO Rice added");
  await picker.getByRole("combobox", { name: "Item", exact: true }).fill("FIFO Salt");
  await page.getByRole("option", { name: "FIFO Salt", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("0.5");
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("button", { name: "Post issuance", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Post issuance?", exact: true });
  await expect(confirm).toContainText("oldest receipt stock first (FIFO)");
  await confirm.getByRole("button", { name: "Confirm and post issuance" }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  await expect(page.getByRole("heading", { name: "Items added separately (2)", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("quiet-posted-two-items-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "View issued totals", exact: true }).click();
  const opener = page.getByRole("button", { name: "View breakdown for FIFO Rice", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  const sources = page.getByRole("dialog", { name: "Details for FIFO Rice" });
  await expect(sources.getByRole("row").filter({ hasText: "FIFO-DR-older" })).toContainText("10 kg");
  await expect(sources.getByRole("row").filter({ hasText: "FIFO-DR-newer" })).toContainText("5.25 kg");
  await expect(sources.locator("dd")).toHaveText(["15.25 kg", "15.25 kg"]);
  await expect(sources.getByText("Adjusted", { exact: true })).toHaveCount(0);
  await sources.getByRole("button", { name: "Calculation details", exact: true }).click();
  await expect(sources.getByText("Decimals allowed", { exact: true })).toBeVisible();
  await expect(sources.getByRole("row").filter({ hasText: /FIFO-DR-/ })).toHaveText([
    /FIFO-DR-older.*Oct 1, 2026.*FIFO-PO-older.*10 kg/,
    /FIFO-DR-newer.*Oct 2, 2026.*FIFO-PO-newer.*5.25 kg/,
  ]);
  await page.screenshot({ path: testInfo.outputPath("fifo-receipt-sources-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(sources.getByRole("list", { name: "Receipt allocations" }).getByText("FIFO-PO-older", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("fifo-receipt-sources-mobile.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("quiet-posted-two-items-mobile.png"), fullPage: true });
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  expect(db.prepare("SELECT a.quantity FROM issuance_receipt_allocation a JOIN issuance_item_total t ON t.id=a.issuanceItemTotalId WHERE t.itemId='fifo-rice' ORDER BY a.receiptDate").all()).toEqual([{ quantity: "10" }, { quantity: "5.25" }]);
  db.prepare("UPDATE purchase_order SET purchaseOrderNo='Changed document' WHERE id='fifo-po-older'").run();
  db.exec("UPDATE item SET name='Changed Rice',issuanceQuantityPolicy='whole-only',baseUnitId='default-unit-piece' WHERE id='fifo-rice'; UPDATE delivery_receipt SET receiptNo='Changed receipt',receiptDate='2026-10-18' WHERE id='fifo-dr-older';");
  db.close();
  await page.reload();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "View issued totals", exact: true }).click();
  await page.getByRole("button", { name: "View breakdown for FIFO Rice", exact: true }).click();
  await expect(sources.getByRole("list", { name: "Receipt allocations" }).getByText("FIFO-PO-older", { exact: true })).toBeVisible();
  await expect(sources.locator("dd")).toHaveText(["15.25 kg", "15.25 kg"]);
  await sources.getByRole("button", { name: "Calculation details", exact: true }).click();
  await expect(sources.getByText("Decimals allowed", { exact: true })).toBeVisible();
  await expect(sources.getByText("Changed receipt", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Pre-allocation history only supplements sources from persisted allocations.
  const historyDb = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  const saved = historyDb.prepare("SELECT postingEvidence FROM issuance_record WHERE mealScheduleId='fifo-meal'").get() as { postingEvidence: string };
  const evidence = JSON.parse(saved.postingEvidence) as IssuanceWorkspace;
  for (const row of evidence.review) delete row.receiptAllocations;
  historyDb.prepare("UPDATE issuance_record SET postingEvidence=? WHERE mealScheduleId='fifo-meal'").run(JSON.stringify(evidence));
  historyDb.exec("UPDATE issuance_receipt_allocation SET basis='reconstructed' WHERE issuanceItemTotalId IN (SELECT id FROM issuance_item_total WHERE itemId='fifo-rice'); DELETE FROM issuance_receipt_allocation WHERE issuanceItemTotalId IN (SELECT id FROM issuance_item_total WHERE itemId='fifo-salt');");
  historyDb.close();
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
    await page.getByRole("button", { name: "View issued totals", exact: true }).click();
    await opener.click();
    await expect(sources.getByText(/they do not prove which receipts were picked/)).toBeVisible();
    await expect(sources.getByText("Historical source reconstructed", { exact: true }).filter({ visible: true })).toHaveCount(2);
    const allocations = viewport.width < 640
      ? sources.getByRole("list", { name: "Receipt allocations" }).getByRole("listitem")
      : sources.getByRole("row").filter({ hasText: /FIFO-DR-/ });
    await expect(allocations).toHaveText([/FIFO-DR-older/, /FIFO-DR-newer/]);
    if (viewport.width < 640) {
      const unit = allocations.last().getByText("kg", { exact: true });
      expect(await unit.evaluate((element) => element.getBoundingClientRect().height <= Number.parseFloat(getComputedStyle(element).lineHeight))).toBe(true);
    }
    await sources.getByRole("button", { name: "Calculation details", exact: true }).click();
    await expect(sources.getByText("Decimals allowed", { exact: true })).toBeVisible();
    await expect(sources.locator("dd")).toHaveText(["15.25 kg", "15.25 kg", "Decimals allowed"]);
    expect(await sources.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`reconstructed-item-${viewport.width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    const saltOpener = page.getByRole("button", { name: "View breakdown for FIFO Salt", exact: true });
    await saltOpener.click();
    const missing = page.getByRole("dialog", { name: "Details for FIFO Salt" });
    await expect(missing.getByText("Receipt sources were not recorded for this older issuance.", { exact: true })).toBeVisible();
    await expect(missing.locator("dd")).toHaveText(["0.5 kg", "0.5 kg"]);
    await expect(missing.getByText("Adjusted", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`missing-sources-${viewport.width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(saltOpener).toBeFocused();
  }

  // Exercise a valid maximum-length Unit label in saved evidence only.
  const longUnit = "W".repeat(30);
  evidence.review.find((row) => row.itemId === "fifo-rice")!.baseUnitAbbreviation = longUnit;
  const longUnitDb = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  longUnitDb.prepare("UPDATE issuance_record SET postingEvidence=? WHERE mealScheduleId='fifo-meal'").run(JSON.stringify(evidence));
  longUnitDb.close();
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
    await page.getByRole("button", { name: "View issued totals", exact: true }).click();
    await opener.click();
    await expect(sources.locator("dd")).toHaveText([`15.25 ${longUnit}`, `15.25 ${longUnit}`]);
    await page.screenshot({ path: testInfo.outputPath(`maximum-unit-${viewport.width}.png`), fullPage: true });
    expect(await sources.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  }
});

test("posted repeating calculation keeps approximation separate from exact issued quantity", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('fifo-repeat-meal','fifo-activity','Dinner','18:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('fifo-repeat-recipe','FIFO repeating salt','fifo repeating salt',3,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe_ingredient (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('fifo-repeat-ingredient','fifo-repeat-recipe','fifo-salt','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto(path.replace("fifo-meal", "fifo-repeat-meal"));
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByLabel("Meal pax", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  await page.getByLabel("Search Recipes").fill("FIFO repeating salt");
  await page.getByRole("checkbox", { name: "FIFO repeating salt", exact: true }).check();
  await page.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await page.getByRole("dialog", { name: "Add Recipes" }).getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Post issuance", exact: true }).click();
  await page.getByRole("dialog", { name: "Post issuance?", exact: true }).getByRole("button", { name: "Confirm and post issuance" }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  await page.getByRole("button", { name: "View issued totals", exact: true }).click();
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 720 }]) {
    await page.setViewportSize(viewport);
    const opener = page.getByRole("button", { name: "View breakdown for FIFO Salt", exact: true });
    await opener.click();
    const details = page.getByRole("dialog", { name: "Details for FIFO Salt" });
    await expect(details.locator("dd")).toHaveText(["0.333333 kg", "≈ 0.333333 kg"]);
    await expect(details.getByText("Adjusted", { exact: true })).toHaveCount(0);
    await details.getByRole("button", { name: "Calculation details", exact: true }).click();
    await expect(details.getByText("Decimals allowed", { exact: true })).toBeVisible();
    expect(await details.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`repeating-calculation-${viewport.width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  }
});

test.afterAll(cleanupIssuanceFixtures);
