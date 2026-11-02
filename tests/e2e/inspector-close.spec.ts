import Database from "better-sqlite3";
import { expect, test, type Locator, type Page } from "@playwright/test";
import type { IssuanceWorkspace } from "../../src/features/issuance/types";

const key = "inspector-close";
const longName = "Long ingredient identity ".repeat(5).slice(0, 100).trimEnd().padEnd(100, "X");
const mealUrl = `/activity-designs/${key}/activities/${key}/meal-schedules/${key}`;
const ingredient = (index: number) => ({ id: `${key}-${index}`, itemId: `${key}-${index}`, itemName: `${index} ${longName}`.slice(0, 100), enteredQuantity: "0.1250", conversionFactor: "1", selectedUnitId: "default-unit-kilogram", selectedUnitName: "Kilogram", selectedUnitAbbreviation: "kg", baseUnitId: "default-unit-kilogram", baseUnitName: "Kilogram", baseUnitAbbreviation: "kg", postedContribution: { quantity: "0.125", approximate: false, numerator: "1", denominator: "8" } });
const lines = Array.from({ length: 12 }, (_, index) => ingredient(index));

function cleanup() {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    for (const [table, field] of [["issuance_record", "id"], ["meal_schedule", "id"], ["activity", "id"], ["activity_design", "id"], ["recipe_ingredient", "recipeId"], ["recipe", "id"], ["delivery_receipt_line", "deliveryReceiptId"], ["delivery_receipt", "id"], ["purchase_order", "id"], ["vendor", "id"]]) db.prepare(`DELETE FROM ${table} WHERE ${field}=?`).run(key);
    db.prepare("DELETE FROM item WHERE id LIKE ?").run(`${key}-%`);
  } finally { db.close(); }
}
test.afterAll(cleanup);

test.beforeAll(() => {
  cleanup();
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec(`INSERT INTO activity_design(id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES ('${key}','INSPECTOR','${longName}',2026,0,0);
      INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES ('${key}','${key}','${longName}','Kitchen',CURRENT_TIMESTAMP,0,0);
      INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('${key}','${key}','Posted lunch','12:00',0,0);
      INSERT INTO recipe(id,name,normalizedName,isActive,baselinePax,createdAt,updatedAt) VALUES ('${key}','${longName}','${longName.toLowerCase()}',1,50,0,0);
      INSERT INTO vendor(id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('${key}','${longName}','${longName.toLowerCase()}',1,0,0);
      INSERT INTO purchase_order(id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('${key}','${longName}','${longName.toLowerCase()}','${key}',0,0);`);
    db.prepare("INSERT INTO delivery_receipt(id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt,note) VALUES (?,?,?,?,?,?,?,?,?,?)").run(key,key,key,longName,longName,longName,longName.toLowerCase(),"2026-10-20T00:00:00.000Z","2026-10-20T00:00:00.000Z","Long saved receipt note ".repeat(30));
    for (const line of lines) {
      db.prepare("INSERT INTO item(id,name,normalizedName,reorderLevel,categoryId,baseUnitId,isActive,createdAt,updatedAt) VALUES (?,?,?,'0','default-category-staples-dry-goods','default-unit-kilogram',1,0,0)").run(line.id,line.itemName,line.itemName.toLowerCase());
      db.prepare("INSERT INTO recipe_ingredient(id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES (?,?,?,'0.1250',0,0)").run(line.id,key,line.id);
      db.prepare("INSERT INTO delivery_receipt_line(id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES (?,?,?,'default-unit-kilogram','default-unit-kilogram',?,'Kilogram','Kilogram','1','1','1','0.10','0.10')").run(line.id,key,line.id,line.itemName);
    }
    const evidence: IssuanceWorkspace = {
      context: { activityDesignId: key, activityId: key, mealScheduleId: key, activityDesignNo: "INSPECTOR", activityDesignTitle: longName, activityName: longName, mealLabel: "Posted lunch", mealTime: "12:00", plannedPax: 50 },
      draft: { id: key, revision: 2, status: "posted", mealPax: 50, recipes: [{ id: key, recipeId: key, recipeName: longName, baselinePax: 50, sourceRevision: "saved", targetMode: "meal", targetPax: 50, ingredients: lines }], stockItems: [] },
      review: lines.map(line => ({ itemId: line.id, itemName: line.itemName, baseUnitId: line.baseUnitId, baseUnitName: line.baseUnitName, baseUnitAbbreviation: "kg", calculatedNumerator: "1", calculatedDenominator: "8", calculatedQuantity: "0.125", calculatedApproximate: false, automaticQuantity: "0.125", finalQuantity: "0.125", adjusted: false, policy: "allow-decimals", warning: null, availableQuantity: "0", shortage: false, receiptAllocations: lines.map(source => ({ receiptLineId: source.id, quantity: "0.01", receiptNo: longName, purchaseOrderNo: longName, receiptDate: "2026-10-20T00:00:00.000Z", basis: "fifo" })) })),
      reviewPending: false, reviewReferences: [], posted: { postedAt: "2026-10-20T04:00:00.000Z", actorId: "e2e-staff-user", actorName: longName, actorUsername: "kitchen.staff" },
    };
    db.prepare("INSERT INTO issuance_record(id,mealScheduleId,mealPax,revision,status,postingEvidence,postedAt,createdAt,updatedAt) VALUES (?,?,50,2,'posted',?,'2026-10-20T04:00:00.000Z',0,0)").run(key,key,JSON.stringify(evidence));
  } finally { db.close(); }
});

test.beforeEach(async ({ page }) => {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
});

async function inspectScroll(dialog: Locator, page: Page, name: string) {
  const scroll = dialog.locator('[data-inspector-scroll]').first();
  await expect(scroll).toHaveCount(1);
  const close = dialog.locator(':scope > [data-slot="dialog-close"]');
  for (const fraction of [0, 0.5, 1]) {
    await scroll.evaluate((element, fraction) => { element.scrollTop = (element.scrollHeight - element.clientHeight) * fraction; }, fraction);
    await expect(close).toBeInViewport({ ratio: 1 });
    const [buttonBox, scrollBox] = await Promise.all([close.boundingBox(), scroll.boundingBox()]);
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(scrollBox!.y);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${name}-${fraction}.png`) });
  }
}

for (const height of [480, 200, 180]) test(`five inspectors keep Close outside long identity and contents at 320x${height}`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height });
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Search Recipes").fill(longName);
  const recipeOpener = page.getByLabel(`Actions for ${longName}`, { exact: true });
  await recipeOpener.click();
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await inspectScroll(page.getByRole("dialog"), page, `recipe-${height}`);
  await page.keyboard.press("Escape");
  await expect(recipeOpener).toBeFocused();

  await page.goto(`/purchase-orders/${key}`);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const receiptOpener = page.getByRole("button", { name: longName, exact: true });
  await receiptOpener.click();
  await inspectScroll(page.getByRole("dialog"), page, `receipt-${height}`);
  await page.keyboard.press("Escape");
  await expect(receiptOpener).toBeFocused();

  await page.goto(mealUrl);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  const postingOpener = page.getByRole("button", { name: "Posting details", exact: true });
  await postingOpener.click();
  await inspectScroll(page.getByRole("dialog"), page, `posting-${height}`);
  await page.keyboard.press("Escape");
  await expect(postingOpener).toBeFocused();
  const totalsOpener = page.getByRole("button", { name: "View issued totals", exact: true });
  await totalsOpener.click();
  const totals = page.getByRole("dialog", { name: "Issued item totals", exact: true });
  await inspectScroll(totals, page, `totals-${height}`);
  const breakdownOpener = totals.getByRole("button", { name: `View breakdown for ${lines[11].itemName}`, exact: true });
  await breakdownOpener.click();
  const breakdown = page.getByRole("dialog", { name: `Details for ${lines[11].itemName}`, exact: true });
  await inspectScroll(breakdown, page, `breakdown-${height}`);
  await page.keyboard.press("Escape");
  // The closed popup loses its accessible name before its exit animation unmounts.
  // Wait for the nested portal to leave before sending Escape to its parent.
  await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(1);
  await expect(totals).toBeVisible();
  await expect(breakdownOpener).toBeFocused();
  // Returning focus opens the breakdown Tooltip; Escape dismisses that first.
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
  await expect(totals).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(totalsOpener).toBeFocused();

  const sheetOpener = page.getByRole("button", { name: `View ingredients for ${longName}`, exact: true });
  await sheetOpener.click();
  const sheet = page.getByRole("dialog", { name: longName, exact: true });
  const sheetBody = sheet.locator(':scope > div').filter({ has: page.getByRole("heading", { name: longName, exact: true }) });
  for (const fraction of [0, 0.5, 1]) {
    await sheetBody.evaluate((element, fraction) => { element.scrollTop = element.scrollHeight * fraction; }, fraction);
    const close = sheet.locator(':scope > [data-slot="sheet-close"]');
    await expect(close).toBeInViewport({ ratio: 1 });
    const [closeBox, bodyBox] = await Promise.all([close.boundingBox(), sheetBody.boundingBox()]);
    expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(bodyBox!.y);
  }
  await page.keyboard.press("Escape");
  await expect(sheetOpener).toBeFocused();
});
