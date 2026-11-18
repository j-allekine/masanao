import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { postFixtureSignIn } from "./fixture-auth";

const mealPath = (suffix: string) => `/activity-designs/e2e-stock-ux-design/activities/e2e-stock-ux-activity/meal-schedules/e2e-stock-ux-${suffix}`;
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT OR IGNORE INTO item (id,name,normalizedName,categoryId,baseUnitId,isActive,reorderLevel,createdAt,updatedAt)
      VALUES ('e2e-stock-ux-replacement','Replacement Rice','replacement rice','default-category-staples-dry-goods','default-unit-kilogram',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO item_unit_conversion (id,itemId,alternateUnitId,baseUnitQuantity,createdAt,updatedAt)
      VALUES ('e2e-stock-ux-small','e2e-stock-ux-replacement','default-unit-sack','25',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
             ('e2e-stock-ux-large','e2e-stock-ux-replacement','default-unit-sack','50',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-stock-ux-design','AD-STOCK-UX',2026,'Stock picker training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-stock-ux-activity','e2e-stock-ux-design','Stock picker preparation','Kitchen',CURRENT_TIMESTAMP,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  for (const suffix of ["repeat", "cancel", "unavailable", "changed-query"]) {
    db.prepare("INSERT OR IGNORE INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,'e2e-stock-ux-activity',?,'12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-stock-ux-${suffix}`, suffix);
  }
  db.close();
});

test("search keeps Stock items in the cart until removed or confirmed", async ({ page }) => {
  const picker = await openPicker(page, "changed-query");
  await picker.getByRole("button", { name: "Add Rice", exact: true }).click();
  await picker.getByRole("searchbox", { name: "Search Stock items" }).fill("No matching Item");
  await expect(picker.getByText("No Stock items match your search.")).toBeVisible();
  await expect(picker.getByRole("heading", { name: "To add (1)" })).toBeVisible();
  await picker.getByRole("button", { name: "Remove Rice", exact: true }).click();
  await expect(picker.getByRole("heading", { name: "To add (0)" })).toBeVisible();
});

async function openPicker(page: Page, suffix: string) {
  expect((await postFixtureSignIn(page.request, {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.goto(`${mealPath(suffix)}`);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
  return page.getByRole("dialog", { name: "Add Stock item" });
}

test("Stock cart preserves exact quantities and supports batch addition", async ({ page }, testInfo) => {
  const picker = await openPicker(page, "repeat");
  await picker.getByRole("button", { name: "Add Rice", exact: true }).click();
  const quantity = picker.getByRole("textbox", { name: "Quantity", exact: true });
  await quantity.fill("0");
  await expect(quantity).toHaveAttribute("aria-invalid", "true");
  const quantityError = "Enter a positive decimal quantity, such as 0.25 or 2.";
  await expect(quantity).toHaveAccessibleDescription(quantityError);
  await expect(picker.getByText(quantityError, { exact: true })).toBeVisible();
  await expect(picker.getByRole("button", { name: "Add 1 Stock item", exact: true })).toBeDisabled();
  await quantity.fill("1250.123456789123");
  await expect(picker.getByText(quantityError, { exact: true })).toHaveCount(0);
  await picker.getByRole("combobox", { name: "Unit", exact: true }).click();
  await page.getByRole("option", { name: "Gram (g) · 0.001 kg", exact: true }).click();
  await expect(picker.getByText("Base quantity: 1.250123456789123 kg", { exact: true })).toBeVisible();
  await picker.getByRole("button", { name: "Add Replacement Rice", exact: true }).click();
  const replacement = picker.getByRole("listitem").filter({ hasText: "Replacement Rice" });
  await replacement.getByRole("combobox", { name: "Unit", exact: true }).click();
  await expect(page.getByRole("option", { name: "Sack (sack) · 25 kg", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Sack (sack) · 50 kg", exact: true })).toBeVisible();
  await page.getByRole("option", { name: "Kilogram (kg) · Base", exact: true }).click();
  await picker.getByRole("listitem").filter({ hasText: "Replacement Rice" }).getByRole("textbox", { name: "Quantity", exact: true }).fill("2.000000000000000001");
  await page.setViewportSize({ width: 320, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("stock-cart-mobile.png"), fullPage: true });
  await picker.getByRole("button", { name: "Add 2 Stock items", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  expect(db.prepare("SELECT stock.enteredQuantity,stock.conversionFactor FROM issuance_stock_item AS stock JOIN issuance_record AS record ON record.id=stock.issuanceRecordId WHERE record.mealScheduleId='e2e-stock-ux-repeat' ORDER BY stock.conversionFactor").all()).toEqual([
    { enteredQuantity: "1250.123456789123", conversionFactor: "0.001" },
    { enteredQuantity: "2.000000000000000001", conversionFactor: "1" },
  ]);
  db.close();
});

test("canceling a pending searchable Stock addition leaves the draft unchanged", async ({ page }, testInfo) => {
  const picker = await openPicker(page, "cancel");
  await picker.getByRole("searchbox", { name: "Search Stock items" }).fill("Rice");
  await picker.getByRole("button", { name: "Add Rice", exact: true }).click();
  await picker.getByRole("textbox", { name: "Quantity", exact: true }).fill("1");
  let release!: () => void;
  let requested!: () => void;
  const requestStarted = new Promise<void>((resolve) => { requested = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**${mealPath("cancel")}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requested();
    await released;
    await route.fulfill({ response: await route.fetch() });
  }, { times: 1 });
  await picker.getByRole("button", { name: "Add 1 Stock item", exact: true }).click();
  await requestStarted;
  await expect(picker.getByRole("button", { name: "Applying…" })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("pending-add-can-be-canceled.png"), fullPage: true });
  await picker.getByRole("button", { name: "Cancel", exact: true }).click();
  const response = page.waitForResponse((result) => result.request().method() === "POST" && result.url().endsWith(`${mealPath("cancel")}`));
  release();
  expect((await response).ok()).toBe(true);
  await expect(page.getByText("No Stock items selected. Add a Stock item for direct issuance.")).toBeVisible();
  await expect(page.getByLabel("Actions for Stock item Rice")).toHaveCount(0);
});

test("unavailable saved Stock Items and Units are marked and can be replaced", async ({ page }, testInfo) => {
  const picker = await openPicker(page, "unavailable");
  await picker.getByRole("searchbox", { name: "Search Stock items" }).fill("Rice");
  await picker.getByRole("button", { name: "Add Rice", exact: true }).click();
  await picker.getByRole("textbox", { name: "Quantity", exact: true }).fill("1");
  const invalidColor = "rgb(157, 65, 55)";
  await picker.getByRole("combobox", { name: "Unit", exact: true }).click();
  await page.getByRole("option", { name: "Gram (g) · 0.001 kg", exact: true }).click();
  await picker.getByRole("button", { name: "Add 1 Stock item", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");

  async function openSavedLine() {
    await page.getByLabel("Actions for Stock item Rice").click();
    await page.getByRole("menuitem", { name: "Edit Stock item", exact: true }).click();
    return page.getByRole("dialog", { name: "Edit Stock item" });
  }

  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    await page.setViewportSize({ width: 320, height: 720 });
    db.prepare("UPDATE unit SET active=0 WHERE id='default-unit-gram'").run();
    const editUnit = await openSavedLine();
    const unit = editUnit.getByRole("combobox", { name: "Unit", exact: true });
    const unitError = "This saved Unit is unavailable. Select a current Unit.";
    await expect(unit).toHaveAttribute("aria-invalid", "true");
    await expect(unit).toHaveCSS("border-top-color", invalidColor);
    await expect(unit).toHaveAccessibleDescription(unitError);
    await expect(editUnit.getByRole("alert").filter({ hasText: unitError })).toBeVisible();
    await unit.click();
    await page.getByRole("option", { name: /Kilogram.*Base/ }).click();
    await expect(unit).toHaveAttribute("aria-invalid", "false");
    await expect(editUnit.getByText(unitError, { exact: true })).toHaveCount(0);
    await editUnit.getByRole("button", { name: "Apply changes" }).click();
    await expect(editUnit).toHaveCount(0);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");

    await page.setViewportSize({ width: 1280, height: 800 });
    db.prepare("UPDATE item SET isActive=0 WHERE id='e2e-recipe-item-rice'").run();
    const editItem = await openSavedLine();
    const item = editItem.getByRole("combobox", { name: "Item", exact: true });
    const itemError = "This saved Item is no longer available. Select an available Item to edit the line.";
    await expect(item).toHaveAttribute("aria-invalid", "true");
    await expect(item).toHaveCSS("border-top-color", invalidColor);
    await expect(item).toHaveAccessibleDescription(itemError);
    await expect(editItem.getByRole("alert").filter({ hasText: itemError })).toBeVisible();
    await expect(editItem.getByRole("region", { name: "Stock already added" }).getByText("Rice", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("unavailable-stock-edit.png"), fullPage: true });
    await item.fill("Replacement Rice");
    await page.getByRole("option", { name: "Replacement Rice", exact: true }).click();
    await expect(item).toHaveAttribute("aria-invalid", "false");
    await expect(editItem.getByText(itemError, { exact: true })).toHaveCount(0);
    await editItem.getByRole("button", { name: "Apply changes" }).click();
    await expect(editItem).toHaveCount(0);
    await expect(page.getByLabel("Actions for Stock item Replacement Rice")).toBeVisible();
  } finally {
    db.prepare("UPDATE unit SET active=1 WHERE id='default-unit-gram'").run();
    db.prepare("UPDATE item SET isActive=1 WHERE id='e2e-recipe-item-rice'").run();
    db.close();
  }
});

test.afterAll(cleanupIssuanceFixtures);
