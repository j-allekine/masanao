import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.use({ actionTimeout: 30_000 });
const itemName = "CSV Journey Eggs";
const mealPath = "/activity-designs/csv256-design/activities/csv256-activity/meal-schedules/csv256-meal";
async function login(page: Page, admin = false) {
  await page.request.post("/api/auth/sign-out", { headers: { origin: process.env.BETTER_AUTH_URL! } });
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: admin ? "municipal.admin" : "kitchen.staff", password: admin ? "administrator-password" : "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
}
async function evidence(page: Page, info: TestInfo, name: string) {
  const dir = process.env.MASANAO_INVENTORY_CSV_EVIDENCE_DIR;
  if (dir) mkdirSync(dir, { recursive: true });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    if (name === "receiving") {
      const bounds = await page.getByRole("dialog", { name: "Record delivery", exact: true }).evaluate((dialog) => {
        const rect = dialog.getBoundingClientRect();
        return {
          dialog: { left: rect.left, right: rect.right, clientWidth: dialog.clientWidth, scrollWidth: dialog.scrollWidth },
          controls: [...dialog.querySelectorAll('#receiptNo, #receiptDate, #note, [data-slot="dialog-footer"] button')].map((control) => {
            const box = control.getBoundingClientRect();
            return { name: control.id || control.textContent, left: box.left, right: box.right };
          }),
        };
      });
      await info.attach(`receiving-bounds-${width}`, { body: JSON.stringify(bounds, null, 2), contentType: "application/json" });
      expect(bounds.dialog.left).toBeGreaterThanOrEqual(0);
      expect(bounds.dialog.right).toBeLessThanOrEqual(width);
      expect(bounds.dialog.scrollWidth).toBeLessThanOrEqual(bounds.dialog.clientWidth);
      for (const control of bounds.controls) {
        expect(control.left, `${control.name} left edge`).toBeGreaterThanOrEqual(bounds.dialog.left);
        expect(control.right, `${control.name} right edge`).toBeLessThanOrEqual(bounds.dialog.right);
      }
      const close = page.getByRole("dialog", { name: "Record delivery", exact: true }).getByRole("button", { name: "Close", exact: true });
      await close.focus();
      await expect(close).toBeFocused();
      const closeState = await close.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        const header = button.parentElement?.querySelector('[data-slot="dialog-header"]');
        return { receivesPointer: hit === button || button.contains(hit), hit: hit?.outerHTML, buttonZ: getComputedStyle(button).zIndex, headerZ: header ? getComputedStyle(header).zIndex : undefined };
      });
      await info.attach(`receiving-close-${width}`, { body: JSON.stringify(closeState, null, 2), contentType: "application/json" });
      expect(closeState.receivesPointer, JSON.stringify(closeState)).toBe(true);
      await close.click({ trial: true });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: dir ? join(dir, `${name}-${width}.png`) : info.outputPath(`${name}-${width}.png`), fullPage: true, style: "nextjs-portal { display: none !important; }" });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
}
async function download(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/^inventory-\d{4}-.*\.csv$/);
  return readFileSync((await file.path())!, "utf8");
}

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('csv256-design','AD-CSV256',2026,'Inventory training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('csv256-activity','csv256-design','Inventory preparation','Kitchen',CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('csv256-meal','csv256-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt) VALUES ('csv256-tray','CSV Tray','csv tray','tray','csvtray',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('csv256-vendor','CSV Vendor','csv vendor',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('csv256-po','CSV256-PO','csv256-po','csv256-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
});

test("authenticated Item creation, alternate receiving, unchanged draft, posted threshold and fresh screen/CSV agree", async ({ page }, info) => {
  test.setTimeout(180_000);
  await login(page, true);
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Create Item", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(itemName);
  await dialog.getByRole("combobox", { name: "Category", exact: true }).click();
  await page.getByRole("option", { name: "Staples & Dry Goods", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Base Unit", exact: true }).click();
  await page.getByRole("option", { name: "Piece (pc)", exact: true }).click();
  await dialog.getByRole("button", { name: "Create Item", exact: true }).click();
  await expect(dialog.getByLabel("Reorder level")).toHaveAttribute("aria-invalid", "true");
  await dialog.getByLabel("Reorder level").fill("10");
  await evidence(page, info, "item-form");
  await dialog.getByRole("button", { name: "Create Item", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByLabel("Search Items").fill(itemName);
  await expect(page.locator("[data-items-table-desktop]")).toContainText("10 pc");
  await evidence(page, info, "item-catalog");
  await page.getByRole("button", { name: `Actions for ${itemName}`, exact: true }).click();
  await page.getByRole("menuitem", { name: "Manage units", exact: true }).click();
  await page.getByRole("button", { name: "Add alternate Unit", exact: true }).click();
  const alternate = page.getByRole("dialog", { name: "Add alternate Unit", exact: true });
  await alternate.getByRole("combobox", { name: "Alternate Unit", exact: true }).click();
  await page.getByRole("option", { name: "CSV Tray (tray)", exact: true }).click();
  await alternate.getByLabel("Base Unit quantity").fill("10");
  await alternate.getByRole("button", { name: "Save alternate Unit", exact: true }).click();
  await expect(alternate).toBeHidden();
  await page.getByRole("button", { name: "Close Units panel", exact: true }).click();
  await login(page);
  await page.goto("/inventory?q=CSV+Journey");
  const eggs = page.getByRole("row").filter({ hasText: itemName });
  await expect(eggs).toContainText("0 pc");
  await expect(eggs).toContainText("Out of stock");
  await page.getByRole("link", { name: "Purchase Orders", exact: true }).click();
  await page.getByRole("link", { name: "CSV256-PO", exact: true }).click();
  await page.getByRole("link", { name: "Record delivery", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/csv256-po\/record-delivery$/, { timeout: 30_000 });
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Receipt number", { exact: true }).fill("CSV256-DR");
  await page.getByRole("combobox", { name: "Item", exact: true }).fill(itemName);
  await page.getByRole("option", { name: itemName, exact: true }).click();
  await page.getByRole("combobox", { name: "Unit", exact: true }).click();
  await page.getByRole("option", { name: "CSV Tray (10 pc)", exact: true }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Unit price", { exact: true }).fill("1");
  await expect(page.getByLabel("Calculated Base Unit quantity", { exact: true })).toHaveText("20 pc");
  await evidence(page, info, "receiving");
  await page.setViewportSize({ width: 320, height: 800 });
  const receiving = page.getByRole("dialog", { name: "Record delivery", exact: true });
  const tableScroll = receiving.locator('[data-slot="table-container"]');
  await page.getByLabel("Quantity", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Unit price", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Unit price", { exact: true })).toBeInViewport();
  expect(await tableScroll.evaluate((table) => table.scrollLeft)).toBeGreaterThan(0);
  expect(await receiving.evaluate((dialog) => dialog.scrollLeft)).toBe(0);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Remove delivery line 1", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Receipt note", { exact: true })).toBeFocused();
  await page.getByLabel("Receipt note", { exact: true }).fill("Keyboard receipt at 320px");
  await page.keyboard.press("Tab");
  await expect(receiving.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await expect(receiving.getByRole("button", { name: "Cancel", exact: true })).toBeInViewport();
  await page.keyboard.press("Tab");
  await expect(receiving.getByRole("button", { name: "Post delivery", exact: true })).toBeFocused();
  await expect(receiving.getByRole("button", { name: "Post delivery", exact: true })).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/purchase-orders\/csv256-po#delivery-receipt-/, { timeout: 30_000 });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/inventory?q=CSV+Journey");
  await expect(eggs).toContainText("20 pc");
  await expect(eggs).toContainText("Good");
  await page.goto(mealPath);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Stock item" });
  await picker.getByRole("combobox", { name: "Item", exact: true }).fill(itemName);
  await page.getByRole("option", { name: itemName, exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("10");
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.goto("/inventory?q=CSV+Journey");
  await expect(eggs).toContainText("20 pc");
  await page.goto(mealPath);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Post issuance", exact: true }).click();
  await page.getByRole("dialog", { name: "Post issuance?", exact: true }).getByRole("button", { name: "Confirm and post issuance" }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  await evidence(page, info, "posted-issuance");
  await page.goto("/inventory?q=CSV+Journey");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(eggs).toContainText("10 pc");
  await expect(eggs).toContainText("Reorder now");
  await evidence(page, info, "inventory");
  expect(await download(page)).toContain('"CSV Journey Eggs","Staples & Dry Goods","Piece (pc)","10","10","Reorder now"');
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    // The UI creates an opaque Item id; scope all cleanup through its unique name.
    db.exec(`CREATE TEMP TABLE csv_owned AS SELECT id FROM item WHERE name='CSV Journey Eggs' OR id LIKE 'csv256-%';
      DELETE FROM issuance_receipt_allocation WHERE issuanceItemTotalId IN (SELECT id FROM issuance_item_total WHERE itemId IN (SELECT id FROM csv_owned));
      DELETE FROM inventory_ledger_movement WHERE itemId IN (SELECT id FROM csv_owned);
      DELETE FROM issuance_item_total WHERE itemId IN (SELECT id FROM csv_owned);
      DELETE FROM issuance_stock_item WHERE itemId IN (SELECT id FROM csv_owned);
      DELETE FROM issuance_record WHERE mealScheduleId='csv256-meal';
      DELETE FROM delivery_receipt_line WHERE itemId IN (SELECT id FROM csv_owned);
      DELETE FROM delivery_receipt WHERE purchaseOrderId='csv256-po';
      DELETE FROM purchase_order WHERE id='csv256-po';
      DELETE FROM vendor WHERE id='csv256-vendor';
      DELETE FROM item_unit_conversion WHERE itemId IN (SELECT id FROM csv_owned);
      DELETE FROM item WHERE id IN (SELECT id FROM csv_owned);
      DELETE FROM unit WHERE id='csv256-tray';
      DELETE FROM meal_schedule WHERE id='csv256-meal';
      DELETE FROM activity WHERE id='csv256-activity';
      DELETE FROM activity_design WHERE id='csv256-design';`);
  } finally { db.close(); }
});

test("filtered export includes off-page rows, exact decimals, safe text, empty results and current authorization", async ({ page }) => {
  test.setTimeout(90_000);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    const insert = db.prepare(`INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?,?,?,'default-category-staples-dry-goods',?,'0.000000000000000001',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
    for (let i=1;i<=23;i++) {
      const n=String(i).padStart(2,"0");
      insert.run(`csv256-${n}`,`CSV Pantry ${n}`,`csv pantry ${n}`,i===23 ? "default-unit-kilogram" : "default-unit-piece");
    }
    db.exec(`INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES ('csv256-offpage','csv256-po','csv256-vendor','CSV Vendor','CSV256-PO','CSV256-OFFPAGE','csv256-offpage',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES ('csv256-offpage','csv256-offpage','csv256-23','default-unit-kilogram','default-unit-kilogram','CSV Pantry 23','Kilogram','Kilogram','0.000000000000000001','1','0.000000000000000001');
      INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('csv256-tiny','csv256-offpage','csv256-23','default-unit-kilogram','0.000000000000000001','stock-in',CURRENT_TIMESTAMP);`);
    expect((await page.request.get("/inventory/export?actor=e2e-admin-user")).status()).toBe(401);
    await login(page);
    await page.goto("/inventory?q=CSV+Pantry&category=default-category-staples-dry-goods&page=3");
    await expect(page.getByText("Showing 21 to 23 of 23 results", { exact:true })).toBeVisible();
    const csv=await download(page);
    expect(csv.split("\r\n")).toHaveLength(25);
    expect(csv.indexOf('"CSV Pantry 01"')).toBeLessThan(csv.indexOf('"CSV Pantry 23"'));
    expect(csv).toContain('"Piece (pc)","0","0.000000000000000001","Out of stock"');
    expect(csv).toContain('"Kilogram (kg)","0.000000000000000001","0.000000000000000001","Reorder now"');
    const response = await page.request.get("/inventory/export?q=CSV+Pantry&category=default-category-staples-dry-goods&status=reorder-now&page=3");
    expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await response.text()).split("\r\n")).toHaveLength(3);
    db.prepare("UPDATE inventory_ledger_movement SET quantity='0.000000000000000002' WHERE id='csv256-tiny'").run();
    expect(await (await page.request.get("/inventory/export?q=CSV+Pantry&status=good")).text()).toContain('"0.000000000000000002"');
    db.prepare("UPDATE inventory_ledger_movement SET quantity='invalid' WHERE id='csv256-tiny'").run();
    const exceptional = await (await page.request.get("/inventory/export?q=CSV+Pantry+23")).text();
    expect(exceptional).toContain('"Unavailable","0.000000000000000001","Review required"');
    await page.goto("/inventory?q=CSV+missing");
    await expect(page.getByText("No matching Items.", { exact:true })).toBeVisible();
    expect((await download(page)).split("\r\n")).toHaveLength(2);
    db.prepare("UPDATE item SET name=? WHERE id='csv256-01'").run(' \t=SUM(1,2)\n"CSV unsafe"');
    expect(await (await page.request.get("/inventory/export?q=CSV+unsafe")).text()).toContain('"\' \t=SUM(1,2)\n""CSV unsafe"""');
    db.prepare("UPDATE user SET role='viewer' WHERE id='e2e-staff-user'").run();
    expect((await page.request.get("/inventory/export")).status()).toBe(403);
    db.prepare("UPDATE user SET role='staff',disabled=1 WHERE id='e2e-staff-user'").run();
    expect([401,403]).toContain((await page.request.get("/inventory/export")).status());
    db.prepare("UPDATE user SET disabled=0 WHERE id='e2e-staff-user'").run();
    await login(page);
    expect((await page.request.get("/inventory/export?q=CSV+Pantry")).status()).toBe(200);
    await login(page,true);
    expect((await page.request.get("/inventory/export?q=CSV+Pantry")).status()).toBe(200);
  } finally {
    db.prepare("UPDATE user SET role='staff',disabled=0 WHERE id='e2e-staff-user'").run();
    db.exec("DELETE FROM inventory_ledger_movement WHERE id='csv256-tiny'; DELETE FROM delivery_receipt_line WHERE id='csv256-offpage'; DELETE FROM delivery_receipt WHERE id='csv256-offpage'; DELETE FROM item WHERE id LIKE 'csv256-%';");
    db.close();
  }
});



