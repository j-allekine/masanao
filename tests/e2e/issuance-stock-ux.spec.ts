import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";

const mealPath = (suffix: string) => `/activity-designs/e2e-stock-ux-design/activities/e2e-stock-ux-activity/meal-schedules/e2e-stock-ux-${suffix}`;
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT OR IGNORE INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-stock-ux-design','AD-STOCK-UX',2026,'Stock picker training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-stock-ux-activity','e2e-stock-ux-design','Stock picker preparation','Kitchen',CURRENT_TIMESTAMP,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  for (const suffix of ["repeat", "cancel", "unavailable", "changed-query"]) {
    db.prepare("INSERT OR IGNORE INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,'e2e-stock-ux-activity',?,'12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-stock-ux-${suffix}`, suffix);
  }
  db.close();
});

test("typing a different Item query cannot add the previously selected Item", async ({ page }) => {
  const picker = await openPicker(page, "changed-query");
  const item = picker.getByRole("combobox", { name: "Item", exact: true });
  await item.fill("Rice");
  await page.getByRole("option", { name: "Rice", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("1");
  await item.fill("No matching Item");
  await expect(page.getByText("No active Items match your search.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker.getByRole("button", { name: "Add Stock item", exact: true })).toBeDisabled();
  await expect(picker.getByRole("heading", { name: "Stock already added (0)" })).toBeVisible();
});

async function openPicker(page: Page, suffix: string) {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.goto(`${mealPath(suffix)}`);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
  return page.getByRole("dialog", { name: "Add Stock item" });
}

test("searchable Stock picker keeps added lines visible and supports repeated exact additions", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const picker = await openPicker(page, "repeat");
  const item = picker.getByRole("combobox", { name: "Item", exact: true });
  await expect(picker.getByText("No Stock lines added yet.")).toBeVisible();
  await item.fill("Rice");
  await page.getByRole("option", { name: "Rice", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("1250.123456789123");
  await picker.getByRole("combobox", { name: "Unit", exact: true }).click();
  await page.getByRole("option", { name: /Gram.*0\.001/ }).click();
  await expect(picker.getByText("Base quantity: 1.250123456789123 kg", { exact: true })).toBeVisible();
  await expect(picker.getByRole("region", { name: "Selected Stock item" }).getByText("Rice", { exact: true })).toBeVisible();
  await picker.getByRole("button", { name: "Clear Stock selection", exact: true }).click();
  await expect(item).toBeFocused();
  await expect(picker.getByRole("region", { name: "Selected Stock item" })).toHaveCount(0);
  await expect(picker.getByLabel("Quantity", { exact: true })).toHaveValue("");
  await item.fill("Rice");
  await page.getByRole("option", { name: "Rice", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("1250.123456789123");
  await picker.getByRole("combobox", { name: "Unit", exact: true }).click();
  await page.getByRole("option", { name: /Gram.*0\.001/ }).click();
  await page.screenshot({ path: testInfo.outputPath("stock-selected-preview.png"), fullPage: true });
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await expect(picker.getByRole("status")).toContainText("Rice added to stock");
  await expect(item).toHaveValue("");
  await expect(picker.getByLabel("Quantity", { exact: true })).toHaveValue("");
  const added = picker.locator('section[aria-label="Stock already added"]');
  await expect(added.getByText("1250.123456789123 g", { exact: true })).toBeVisible();
  await item.fill("Nothing matches this search");
  await expect(page.getByText("No active Items match your search.")).toBeVisible();
  await expect(added.getByText("Rice", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({ path: testInfo.outputPath("desktop-search-and-added-lines.png"), fullPage: true });
  await item.fill("Rice");
  await page.getByRole("option", { name: "Rice", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("0");
  await expect(picker.getByRole("button", { name: "Add Stock item", exact: true })).toBeDisabled();
  await expect(picker.getByLabel("Quantity", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(picker.getByText("Enter a positive decimal quantity, such as 0.25 or 2.")).toBeVisible();
  await picker.getByLabel("Quantity", { exact: true }).fill("2.000000000000000001");
  await expect(picker.getByText("Base quantity: 2.000000000000000001 kg", { exact: true })).toBeVisible();
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await expect(picker.getByRole("heading", { name: "Stock already added (2)" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 720 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(picker.getByLabel("Quantity", { exact: true })).toBeVisible();
  await expect(picker.getByRole("combobox", { name: "Unit", exact: true })).toBeVisible();
  await added.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("mobile-repeated-stock-lines.png"), fullPage: true });
  await picker.getByRole("button", { name: "Done", exact: true }).click();
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
  await picker.getByRole("combobox", { name: "Item", exact: true }).fill("Rice");
  await page.getByRole("option", { name: "Rice", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("1");
  let release!: () => void;
  let requested!: () => void;
  const requestStarted = new Promise<void>((resolve) => { requested = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**${mealPath("cancel")}`, async (route) => {
    requested();
    await released;
    await route.continue();
  }, { times: 1 });
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await requestStarted;
  await expect(picker.getByRole("button", { name: "Applying…" })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("pending-add-can-be-canceled.png"), fullPage: true });
  await picker.getByRole("button", { name: "Cancel", exact: true }).click();
  const response = page.waitForResponse((result) => result.request().method() === "POST" && result.url().endsWith(`${mealPath("cancel")}`));
  release();
  await (await response).finished();
  await expect(page.getByText("No Stock items selected. Add a Stock item for direct issuance.")).toBeVisible();
  await expect(page.getByLabel("Actions for Stock item Rice")).toHaveCount(0);
});

test("unavailable saved Stock Items show their saved line and a visible editing message", async ({ page }, testInfo) => {
  const picker = await openPicker(page, "unavailable");
  await picker.getByRole("combobox", { name: "Item", exact: true }).fill("Rice");
  await page.getByRole("option", { name: "Rice", exact: true }).click();
  await picker.getByLabel("Quantity", { exact: true }).fill("1");
  await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.prepare("UPDATE item SET isActive=0 WHERE id='e2e-recipe-item-rice'").run();
  try {
    await page.getByLabel("Actions for Stock item Rice").click();
    await page.getByRole("menuitem", { name: "Edit Stock item", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Edit Stock item" });
    await expect(edit.getByText("This saved Item is no longer available. Select an available Item to edit the line.")).toBeVisible();
    await expect(edit.getByRole("region", { name: "Stock already added" }).getByText("Rice", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("unavailable-stock-edit.png"), fullPage: true });
    await edit.getByRole("button", { name: "Cancel", exact: true }).click();
  } finally {
    db.prepare("UPDATE item SET isActive=1 WHERE id='e2e-recipe-item-rice'").run();
    db.close();
  }
});

test.afterAll(cleanupIssuanceFixtures);
