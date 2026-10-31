import Database from "better-sqlite3";
import { expect, test, type Page } from "@playwright/test";

async function expectReportScrollsBelowPinnedHeader(page: Page, distance: number) {
  const header = page.locator('[data-slot="workspace-header"]');
  const reportControls = [
    page.getByRole("heading", { name: "Budget accounting", exact: true }),
    page.getByRole("button", { name: "Reporting period", exact: true }),
    page.getByRole("button", { name: "Refresh", exact: true }),
  ];
  const initialTops = await Promise.all(reportControls.map((control) =>
    control.evaluate((element) => element.getBoundingClientRect().top),
  ));
  const initialScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, distance);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(initialScroll);
  await expect(header).toBeInViewport({ ratio: 1 });
  const headerTop = await header.evaluate((element) => element.getBoundingClientRect().top);
  expect(headerTop).toBeGreaterThanOrEqual(0);
  expect(headerTop).toBeLessThanOrEqual(1);
  for (const [index, control] of reportControls.entries()) {
    await expect.poll(() => control.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(initialTops[index]);
  }
}

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.transaction(() => {
      db.exec(`
        INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('bvar-vendor','Budget vendor','bvar vendor',1,0,0);
        INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('bvar-po','BVAR-PO','bvar-po','bvar-vendor',0,0);
        INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('bvar-item','Budget rice','bvar rice','default-category-staples-dry-goods','default-unit-kilogram','0',1,0,0);
        INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('bvar-design','BVAR-AD',2020,'Budget review',0,0);
      `);
      for (const [id, amount] of [["priced", "12500"], ["missing", null]] as const) {
        db.prepare("INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,'bvar-po','bvar-vendor','Budget vendor','BVAR-PO',?,?,?,?)").run(`bvar-dr-${id}`, `BVAR-${id}`, `bvar-${id}`, "2020-09-01T00:00:00.000Z", "2020-09-01T08:00:00.000Z");
        db.prepare("INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES (?,?,'bvar-item','default-unit-kilogram','default-unit-kilogram','Budget rice','Kilogram','Kilogram','250','1','250','50',?)").run(`bvar-line-${id}`, `bvar-dr-${id}`, amount);
        db.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,'bvar-item','default-unit-kilogram','250','stock-in',?)").run(`bvar-in-${id}`, `bvar-line-${id}`, "2020-09-01T00:00:00.000Z");
      }
      const activities = [["under", "A Workshop", 500000, "42", "priced"], ["over", "B Feeding", 100000, "30", "priced"], ["incomplete", "C Missing price", 100000, "1", "missing"], ["unbudgeted", "D No budget", null, null, null], ["zero", "E Zero budget", 0, null, null], ["last", "F Another Activity", 100000, null, null]] as const;
      for (const [id, name, budget, quantity, source] of activities) {
        db.prepare("INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedBudgetCentavos,createdAt,updatedAt) VALUES (?,'bvar-design',?,'Kitchen',?,?,0,0)").run(`bvar-${id}`, name, "2020-10-15T00:00:00.000Z", budget);
        db.prepare("INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,?,'Lunch','12:00',0,0)").run(`bvar-meal-${id}`, `bvar-${id}`);
        if (quantity && source) {
          db.prepare("INSERT INTO issuance_record (id,mealScheduleId,revision,status,postedAt,createdAt,updatedAt) VALUES (?,?,1,'posted',?,0,0)").run(`bvar-issue-${id}`, `bvar-meal-${id}`, "2020-10-15T04:00:00.000Z");
          db.prepare("INSERT INTO issuance_item_total (id,issuanceRecordId,itemId,calculatedNumerator,calculatedDenominator,finalQuantity,adjusted) VALUES (?,?,'bvar-item',?,'1',?,0)").run(`bvar-total-${id}`, `bvar-issue-${id}`, quantity, quantity);
          db.prepare("INSERT INTO issuance_receipt_allocation (id,issuanceItemTotalId,deliveryReceiptLineId,quantity,basis,receiptNo,purchaseOrderNo,receiptDate) VALUES (?,?,?,?,'fifo',?,'BVAR-PO',?)").run(`bvar-allocation-${id}`, `bvar-total-${id}`, `bvar-line-${source}`, quantity, `BVAR-${source}`, "2020-09-01T00:00:00.000Z");
          db.prepare("INSERT INTO inventory_ledger_movement (id,issuanceItemTotalId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,'bvar-item','default-unit-kilogram',?,'stock-out',?)").run(`bvar-out-${id}`, `bvar-total-${id}`, quantity, "2020-10-15T04:00:00.000Z");
        }
      }
      db.exec("INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('bvar-pending','bvar-under','Dinner','18:00',0,0)");
    })();
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try { db.transaction(() => {
    for (const table of ["issuance_receipt_allocation", "inventory_ledger_movement", "issuance_item_total", "issuance_record", "meal_schedule", "activity", "activity_design", "delivery_receipt_line", "delivery_receipt", "purchase_order", "item", "vendor"]) db.prepare(`DELETE FROM ${table} WHERE id LIKE 'bvar-%'`).run();
  })(); } finally { db.close(); }
});

test("budget figures, pinned workspace header, scrolling report controls and Activity row navigation work on desktop and mobile", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard?start=2020-10-01&end=2020-10-31");
  await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible();
  const table = page.getByRole("table", { name: "Activity budget comparison", exact: true });
  await expect(page.getByRole("heading", { name: "Budget accounting", exact: true })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Stock reconciliation", exact: true })).not.toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Status", exact: true })).toHaveCount(0);
  const under = table.getByRole("row").filter({ hasText: "A Workshop" });
  await expect(under).toContainText("₱5,000.00");
  await expect(under).toContainText("₱2,100.00");
  await expect(under).toContainText("+₱2,900.00");
  await expect(under).toContainText("42.0%");
  await expect(under).toContainText("1 meal not posted");
  const over = table.getByRole("row").filter({ hasText: "B Feeding" });
  await expect(over).toContainText("−₱500.00");
  await expect(over).toContainText("150.0%");
  await expect(table.getByRole("row").filter({ hasText: "C Missing price" })).toContainText("Cost incomplete");
  await expect(table.getByRole("row").filter({ hasText: "D No budget" })).toContainText("Not recorded");
  await expect(table.getByRole("button")).toHaveCount(0);
  await expect(under.getByRole("link", { name: "A Workshop", exact: true })).toHaveAttribute("href", /\/activities\/bvar-under$/);
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.mouse.move(1200, 550);
  await expectReportScrollsBelowPinnedHeader(page, 900);
  await page.mouse.wheel(0, -2000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await under.getByRole("cell", { name: "42.0%", exact: true }).click();
  await expect(page).toHaveURL(/\/activities\/bvar-under$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "A Workshop", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goBack();
  await under.getByRole("link", { name: "A Workshop", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/activities\/bvar-under$/, { timeout: 30_000 });
  await page.goBack();
  await expect(under).toBeVisible();
  await page.getByLabel("Activity budget pagination").getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/budgetPage=2/);
  await expect(table).toContainText("F Another Activity");
  await page.goBack();
  await expect(under).toBeVisible();
  await page.screenshot({ path: info.outputPath("budget-desktop.png"), fullPage: true });
  for (const width of [1024, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const mobileUnder = page.locator('[data-budget-mobile] article').filter({ hasText: "A Workshop" });
  await expect(mobileUnder).toContainText("+₱2,900.00");
  await page.mouse.move(280, 700);
  await expectReportScrollsBelowPinnedHeader(page, 800);
  await page.mouse.wheel(0, -2000);
  await mobileUnder.getByText("+₱2,900.00", { exact: true }).click();
  await expect(page).toHaveURL(/\/activities\/bvar-under$/, { timeout: 30_000 });
  await page.goBack();
  await expect(mobileUnder).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("budget-mobile.png"), fullPage: true });
  await page.reload();
  await expect(mobileUnder).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search Activities by name or Office", exact: true });
  await search.fill("Feeding");
  await search.press("Enter");
  await expect(page).toHaveURL(/activitySearch=Feeding/);
  await expect(page.locator('[data-budget-mobile] article')).toHaveCount(1);
  await expect(page.locator('[data-budget-mobile]')).toContainText("−₱500.00");
  await search.fill("No matching entry");
  await search.press("Enter");
  await expect(page.getByText("No matching Activities", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator('[data-budget-mobile] article')).toHaveCount(5);
  await expect(search).toBeFocused();
  const dashboardBackground = await page.locator('[data-dashboard-surface]').evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.goto("/inventory");
  await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
  expect(await page.locator('[data-inventory-ready]').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(dashboardBackground);
});

test("pagination waits for a pending period change without restoring the previous dates", async ({ page }) => {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/dashboard?start=2020-10-01&end=2020-10-31");
  const next = page.getByLabel("Activity budget pagination").getByRole("button", { name: "Next page", exact: true });
  await expect(next).toBeEnabled();
  await page.getByRole("button", { name: "Reporting period", exact: true }).click();
  await page.getByLabel("From", { exact: true }).fill("2020-08-01");
  await page.getByLabel("To", { exact: true }).fill("2020-08-31");
  let releasePeriod = () => {};
  const responseGate = new Promise<void>((resolve) => { releasePeriod = resolve; });
  await page.route("**/dashboard?start=2020-08-01**", async (route) => { await responseGate; await route.continue(); }, { times: 1 });
  await page.getByRole("button", { name: "Apply period", exact: true }).click();
  try {
    await expect(page.getByRole("button", { name: "Reporting period", exact: true })).toBeDisabled();
    await expect(next).toBeDisabled();
  } finally { releasePeriod(); }
  await expect(page).toHaveURL(/start=2020-08-01&end=2020-08-31/);
  await expect(page.getByText("No Activities scheduled in this period", { exact: true })).toBeVisible();
});
