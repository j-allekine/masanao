import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { postFixtureSignIn } from "../e2e/fixture-auth";

let rice = "";
const salt = "opening-post-salt";
const mealPath = "/activity-designs/opening-post-design/activities/opening-post-activity/meal-schedules/opening-post-meal";

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt)
    VALUES ('${salt}','Posting Salt','posting salt','default-category-staples-dry-goods','default-unit-kilogram','1',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt)
    VALUES ('opening-post-sack','Posting Sack','posting sack','posting-sack','posting-sack',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt)
    VALUES ('opening-post-design','AD-OPENING-POST',2026,'Opening supplies',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,plannedBudgetCentavos,createdAt,updatedAt)
    VALUES ('opening-post-activity','opening-post-design','Opening supplies meal','Kitchen',CURRENT_TIMESTAMP,10,1000000,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt)
    VALUES ('opening-post-meal','opening-post-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
});

test("same-Item cost lines survive reload and create distinct mixed-source issuance evidence on desktop and mobile", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(20_000);
  expect((await postFixtureSignIn(page.request, { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Opening Stock", exact: true }).click();
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Start opening stock", exact: true }).click();
  await page.getByRole("button", { name: "Add items", exact: true }).click();
  await page.getByLabel("Search Items", { exact: true }).fill("Posting Rice");
  await page.getByRole("button", { name: "Create Item: Posting Rice", exact: true }).click();
  const itemEditor = page.getByRole("dialog", { name: "Create Item", exact: true });
  await itemEditor.getByRole("combobox", { name: "Category", exact: true }).click();
  await page.getByRole("option", { name: "Staples & Dry Goods", exact: true }).click();
  await itemEditor.getByRole("combobox", { name: "Base Unit", exact: true }).click();
  await page.getByRole("option", { name: "Kilogram (kg)", exact: true }).click();
  await itemEditor.getByLabel("Reorder level", { exact: false }).fill("10");
  await itemEditor.getByRole("button", { name: "Add alternate Unit", exact: true }).click();
  await itemEditor.getByRole("combobox", { name: "Alternate Unit 1", exact: true }).click();
  await page.getByRole("option", { name: "Posting Sack (posting-sack)", exact: true }).click();
  await itemEditor.getByRole("textbox", { name: "Base Unit quantity 1", exact: true }).fill("25");
  await itemEditor.getByRole("button", { name: "Create Item", exact: true }).click();
  await expect(itemEditor).toBeHidden();
  const catalog = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  rice = (catalog.prepare("SELECT id FROM item WHERE name = 'Posting Rice'").get() as { id: string }).id;
  expect(rice).toBeTruthy();
  catalog.close();
  for (const name of ["Posting Salt"]) {
    await page.getByRole("button", { name: "Add items", exact: true }).click();
    await page.getByLabel("Search Items", { exact: true }).fill(name);
    await page.getByRole("dialog", { name: "Add items", exact: true }).getByRole("button", { name: new RegExp(`^${name} Staples & Dry Goods`) }).click();
  }
  await page.getByRole("textbox", { name: "Quantity for Posting Rice", exact: true }).fill("2");
  await page.getByRole("combobox", { name: "Unit for Posting Rice", exact: true }).click();
  await page.getByRole("option", { name: "Posting Sack (25 kg)", exact: true }).click();
  await page.getByRole("textbox", { name: "Opening unit cost for Posting Rice", exact: true }).fill("1250");
  await page.getByRole("textbox", { name: "Quantity for Posting Salt", exact: true }).fill("1");
  await page.getByRole("textbox", { name: "Opening unit cost for Posting Salt", exact: true }).fill("0");
  await page.getByRole("textbox", { name: "Reason for zero cost", exact: true }).fill("Confirmed zero opening value");
  await page.getByRole("button", { name: "Add another cost line for Posting Rice", exact: true }).click();
  await page.getByRole("textbox", { name: "Quantity for Posting Rice, line 3", exact: true }).fill("25");
  await page.getByRole("textbox", { name: "Opening unit cost for Posting Rice, line 3", exact: true }).fill("55");
  // Deliberate second-line edit must not change the first line.
  await expect(page.getByRole("textbox", { name: "Quantity for Posting Rice, line 1", exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Add another cost line for Posting Rice", exact: true }).click();
  await page.getByRole("button", { name: "Remove Posting Rice, line 4", exact: true }).click();
  await page.getByRole("button", { name: "Move line 3 up", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await page.reload();
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Quantity for Posting Rice, line 2", exact: true })).toHaveValue("25");
  await expect(page.getByRole("textbox", { name: "Opening unit cost for Posting Rice, line 2", exact: true })).toHaveValue("55");
  await page.getByRole("textbox", { name: "Quantity for Posting Rice, line 2", exact: true }).fill("-1");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Quantity for Posting Rice, line 2", exact: true })).toBeFocused();
  await page.getByRole("textbox", { name: "Quantity for Posting Rice, line 2", exact: true }).fill("25");
  await page.screenshot({ path: testInfo.outputPath("opening-cost-lines-count-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole("textbox", { name: "Quantity for Posting Rice, line 2", exact: true })).toHaveValue("25");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("opening-cost-lines-count-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Review opening stock", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Review opening stock", exact: true });
  await expect(review).toBeVisible();
  await expect(review.getByRole("button", { name: "Post opening stock", exact: true })).toBeDisabled();
  await expect(review).toContainText("50 kg");
  await expect(review).toContainText("25 kg");
  await expect(review).toContainText("Line 2");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: testInfo.outputPath("opening-post-review-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  await review.getByRole("checkbox").check();
  await review.getByText("I confirm the zero costs and their recorded reasons.", { exact: true }).evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(review.getByText("I confirm the zero costs and their recorded reasons.", { exact: true })).toBeInViewport({ ratio: 1 });
  await expect(review.getByRole("button", { name: "Post opening stock", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("opening-post-review-mobile.png"), fullPage: true });
  await review.getByRole("button", { name: "Post opening stock", exact: true }).click();
  await expect(page.getByRole("heading", { name: "OS-0001", exact: true })).toBeVisible();
  await expect(page.getByText("Municipal Administrator", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Discard setup draft", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("opening-post-record-mobile.png"), fullPage: true });

  // Procurement masters are fixtures; receiving and stock effects use the real UI.
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('opening-post-vendor','Opening Supplier','opening supplier',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('opening-post-po','PO-AFTER-OPENING','po-after-opening','opening-post-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/purchase-orders/opening-post-po/record-delivery");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("textbox", { name: "Receipt number", exact: true }).fill("DR-AFTER-OPENING");
  await page.getByRole("combobox", { name: "Item", exact: true }).fill("Posting Rice");
  await page.getByRole("option", { name: "Posting Rice", exact: true }).click();
  await page.getByLabel("Quantity", { exact: true }).fill("25");
  await page.getByLabel("Unit price", { exact: true }).fill("60");
  await page.getByRole("button", { name: "Post delivery", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/opening-post-po#delivery-receipt-/, { timeout: 30_000 });
  await page.goto(mealPath);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Stock item", exact: true });
  await picker.getByRole("searchbox", { name: "Search Stock items" }).fill("Posting Rice");
  await picker.getByRole("button", { name: "Add Posting Rice", exact: true }).click();
  await picker.getByRole("textbox", { name: "Quantity", exact: true }).fill("80");
  await picker.getByRole("searchbox", { name: "Search Stock items" }).fill("Posting Salt");
  await picker.getByRole("button", { name: "Add Posting Salt", exact: true }).click();
  await picker.getByRole("listitem").filter({ hasText: "Posting Salt" }).getByRole("textbox", { name: "Quantity", exact: true }).fill("0.5");
  await picker.getByRole("button", { name: "Add 2 Stock items", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("button", { name: "Post issuance", exact: true }).click();
  await page.getByRole("dialog", { name: "Post issuance?", exact: true }).getByRole("button", { name: "Confirm and post issuance" }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  await page.getByRole("button", { name: "View issued totals", exact: true }).click();
  await page.getByRole("button", { name: "View breakdown for Posting Rice", exact: true }).click();
  const sources = page.getByRole("dialog", { name: "Details for Posting Rice", exact: true });
  await expect(sources.getByRole("row").filter({ hasText: /OS-0001.*Line 1/ })).toContainText("50 kg");
  await expect(sources.getByRole("row").filter({ hasText: /OS-0001.*Line 2/ })).toContainText("25 kg");
  await expect(sources.getByRole("row").filter({ hasText: "DR-AFTER-OPENING" })).toContainText("5 kg");
  await page.screenshot({ path: testInfo.outputPath("opening-mixed-sources-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(sources.getByRole("list", { name: "Opening Stock allocations" })).toContainText("OS-0001");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("opening-mixed-sources-mobile.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "View breakdown for Posting Salt", exact: true }).click();
  const zero = page.getByRole("dialog", { name: "Details for Posting Salt", exact: true });
  await expect(zero.getByRole("list", { name: "Opening Stock allocations" })).toContainText("₱0.00");
  await expect(zero.getByRole("heading", { name: "Receipt sources", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/inventory/opening-stock");
  await expect(page.locator('[data-opening-corrections-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Record correction", exact: true }).click();
  await page.getByRole("button", { name: "Add omitted stock", exact: true }).click();
  let correction = page.getByRole("dialog", { name: "Add omitted stock", exact: true });
  await correction.getByRole("textbox", { name: "Reason for correction", exact: true }).fill("A sealed container present at the count was omitted from its sheet.");
  await correction.getByRole("button", { name: "Add items", exact: true }).click();
  const omittedPicker = page.getByRole("dialog", { name: "Add omitted Item", exact: true });
  await omittedPicker.getByRole("textbox", { name: "Search Items", exact: true }).fill("Posting Rice");
  await omittedPicker.getByRole("button", { name: /^Posting Rice / }).click();
  await correction.getByRole("textbox", { name: "Added quantity", exact: true }).fill("6");
  await correction.getByRole("textbox", { name: "Opening unit cost", exact: true }).fill("70");
  await correction.getByRole("button", { name: "Review correction", exact: true }).click();
  let correctionReview = page.getByRole("dialog", { name: "Review correction", exact: true });
  await expect(correctionReview).toContainText("+6 kg");
  await correctionReview.getByRole("button", { name: "Post correction", exact: true }).click();
  await page.getByRole("dialog", { name: /OS-0001-C/ }).getByRole("button", { name: "Close", exact: true }).last().click();
  for (const kind of ["Reduce remaining stock", "Correct remaining cost"]) {
    await page.getByRole("button", { name: "Record correction", exact: true }).click();
    await page.getByRole("button", { name: kind, exact: true }).click();
    correction = page.getByRole("dialog", { name: kind, exact: true });
    await correction.getByRole("textbox", { name: "Reason for correction", exact: true }).fill(kind === "Reduce remaining stock" ? "Recount removed one kilogram that was entered twice." : "Correct the supported price of the entire remaining container.");
    await correction.getByRole("button", { name: "Select source lines", exact: true }).click();
    const sourcePicker = page.getByRole("dialog", { name: "Select source line", exact: true });
    await sourcePicker.getByRole("button", { name: /Posting Rice.*source 4/ }).click();
    if (kind === "Reduce remaining stock") await correction.getByLabel("Reduction quantity (kg)", { exact: true }).fill("1");
    else await correction.getByLabel("Replacement cost per Base Unit (kg)", { exact: true }).fill("80");
    await correction.getByRole("button", { name: "Review correction", exact: true }).click();
    correctionReview = page.getByRole("dialog", { name: "Review correction", exact: true });
    if (kind === "Reduce remaining stock") await expect(correctionReview).toContainText("After: 5 kg");
    else {
      await expect(correctionReview).toContainText("Quantity before and after: 5 kg → 5 kg");
      await expect(correctionReview).toContainText("Replacement value: ₱400");
    }
    expect(await correctionReview.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`journey-${kind === "Reduce remaining stock" ? "reduction" : "replacement"}-320.png`), fullPage: true });
    await correctionReview.getByRole("button", { name: "Post correction", exact: true }).click();
    await page.getByRole("dialog", { name: /OS-0001-C/ }).getByRole("button", { name: "Close", exact: true }).last().click();
  }
  await expect(page.getByRole("button", { name: "View correction", exact: true })).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath("journey-history-320.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/inventory?q=Posting%20Rice");
  await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
  const inventoryRice = page.getByRole("row").filter({ hasText: "Posting Rice" });
  await expect(inventoryRice).toContainText("25 kg");
  await inventoryRice.getByRole("button", { name: /Display unit for Posting Rice/ }).click();
  await page.getByRole("menuitemradio", { name: "Posting Sack", exact: true }).click();
  await expect(inventoryRice).toContainText("1 posting-sack");
  await page.screenshot({ path: testInfo.outputPath("journey-inventory-1440.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("journey-inventory-320.png"), fullPage: true });
  await page.goto("/dashboard");
  await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Opening supplies meal", exact: true })).toBeVisible();
  await expect(page.getByText("₱4,175.00", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("journey-dashboard-320.png"), fullPage: true });
});

