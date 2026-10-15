import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";

const mealPath = (suffix: string) => `/activity-designs/e2e-regression-design/activities/e2e-regression-activity/meal-schedules/e2e-regression-${suffix}`;

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT OR IGNORE INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-regression-design','AD-REGRESSION',2026,'Regression training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-regression-activity','e2e-regression-design','Regression preparation','Kitchen',CURRENT_TIMESTAMP,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO item (id,name,normalizedName,categoryId,baseUnitId,isActive,issuanceQuantityPolicy,createdAt,updatedAt) VALUES ('e2e-regression-item','Regression Eggs','regression eggs','default-category-staples-dry-goods','default-unit-piece',1,'whole-only',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO recipe (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('e2e-regression-recipe','Regression Omelet','regression omelet',1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT OR IGNORE INTO recipe_ingredient (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-regression-ingredient','e2e-regression-recipe','e2e-regression-item','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  for (const suffix of ["pax", "removal", "cancel", "escape", "history"]) {
    db.prepare("INSERT OR IGNORE INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,'e2e-regression-activity',?,'12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-regression-${suffix}`, suffix);
  }
  db.close();
});

async function signIn(page: Page) {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
}
async function openIssuance(page: Page, suffix: string) {
  await page.goto(`${mealPath(suffix)}`);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
}
async function addRecipe(page: Page) {
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  await page.getByLabel("Search Recipes").fill("Regression Omelet");
  await page.getByRole("checkbox", { name: "Regression Omelet" }).check();
  await page.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add Recipes" }).getByRole("heading", { name: /Already added/ })).toBeVisible();
  await page.getByRole("dialog", { name: "Add Recipes" }).getByRole("button", { name: "Done", exact: true }).click();
}
async function confirmAutomatic(page: Page, quantity: string) {
  await page.getByRole("button", { name: "Review quantities and stock" }).click();
  const review = page.getByRole("dialog", { name: "Combined quantities and stock" });
  await review.getByRole("button", { name: "Adjust issued quantity for Regression Eggs" }).click();
  await review.getByLabel("Final quantity for Regression Eggs").fill(quantity);
  await review.getByRole("button", { name: "Confirm quantity" }).click();
  await page.keyboard.press("Escape");
}

test("redundant confirmation follows changed demand before save", async ({ page }, testInfo) => {
  await signIn(page);
  await openIssuance(page, "pax");
  await addRecipe(page);
  await confirmAutomatic(page, "10");
  await page.getByLabel("Meal pax", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Review quantities and stock" }).click();
  await expect(page.getByRole("dialog").getByText("20 pc", { exact: true }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.screenshot({ path: testInfo.outputPath("changed-demand-saved.png"), fullPage: true });
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  expect(db.prepare("SELECT total.finalQuantity,total.adjusted FROM issuance_item_total AS total JOIN issuance_record AS record ON record.id=total.issuanceRecordId WHERE record.mealScheduleId='e2e-regression-pax'").get()).toEqual({ finalQuantity: "20", adjusted: 0 });
  db.close();
});

test("removing a redundantly confirmed Item saves its removal", async ({ page }) => {
  await signIn(page);
  await openIssuance(page, "removal");
  await addRecipe(page);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await confirmAutomatic(page, "10");
  await page.getByLabel("Actions for Regression Omelet").click();
  await page.getByRole("menuitem", { name: "Remove Recipe" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  expect(db.prepare("SELECT count(*) AS count FROM issuance_item_total AS total JOIN issuance_record AS record ON record.id=total.issuanceRecordId WHERE record.mealScheduleId='e2e-regression-removal'").get()).toEqual({ count: 0 });
  db.close();
});

for (const cancel of ["cancel", "escape"] as const) {
  test(`canceled delayed Stock apply cannot mutate draft or a newer picker (${cancel})`, async ({ page }, testInfo) => {
    await signIn(page);
    await openIssuance(page, cancel);
    await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Add Stock item" });
    await picker.getByRole("combobox", { name: "Item", exact: true }).click();
    await page.getByRole("option", { name: "Rice", exact: true }).click();
    await picker.getByLabel("Quantity", { exact: true }).fill("1");
    let release!: () => void;
    let requested!: () => void;
    const requestStarted = new Promise<void>((resolve) => { requested = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    await page.route(`**${mealPath(cancel)}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      requested();
      await released;
      await route.continue();
    }, { times: 1 });
    await picker.getByRole("button", { name: "Add Stock item", exact: true }).click();
    await requestStarted;
    if (cancel === "cancel") await picker.getByRole("button", { name: "Cancel", exact: true }).click();
    else await page.keyboard.press("Escape");
    await expect(picker).not.toBeVisible();
    await page.getByRole("button", { name: "Add Stock item", exact: true }).click();
    const response = page.waitForResponse((result) => result.request().method() === "POST" && result.url().endsWith(`${mealPath(cancel)}`));
    release();
    await (await response).finished();
    await expect(picker.getByLabel("Quantity", { exact: true })).toBeEnabled();
    await picker.getByLabel("Quantity", { exact: true }).fill("7");
    await expect(picker).toBeVisible();
    await expect(picker.getByLabel("Quantity", { exact: true })).toHaveValue("7");
    await picker.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("No Stock items selected. Add a Stock item for direct issuance.")).toBeVisible();
    await expect(page.getByLabel("Actions for Stock item Rice")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("canceled-stock-unchanged.png"), fullPage: true });
  });
}

// The history guard can deliberately supersede a navigation before Next loads it.
// Assert the final destination below; surface every other navigation error.
async function traverseHistory(page: Page, direction: "back" | "forward") {
  try {
    if (direction === "back") await page.goBack({ waitUntil: "domcontentloaded" });
    else await page.goForward({ waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("net::ERR_ABORTED")) throw error;
  }
}

test("dirty browser Back resumes the actual previous page without reopening issuance", async ({ page }, testInfo) => {
  await signIn(page);
  await page.goto("/activity-designs");
  await page.goto("/purchase-orders");
  await openIssuance(page, "history");
  await page.getByLabel("Meal pax", { exact: true }).fill("11");
  await traverseHistory(page, "back");
  const discard = page.getByRole("dialog", { name: "Discard unsaved changes?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("11");
  await traverseHistory(page, "back");
  await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/);
  await traverseHistory(page, "back");
  await expect(page).toHaveURL(/\/activity-designs$/);
  await page.screenshot({ path: testInfo.outputPath("original-history-destination.png"), fullPage: true });
  await expect(page.getByRole("heading", { name: "Activity Designs", exact: true })).toBeVisible();
  await traverseHistory(page, "forward");
  await expect(page).toHaveURL(/\/purchase-orders$/);
  await traverseHistory(page, "forward");
  await expect(page).toHaveURL(/\/meal-schedules\/[^/]+$/);
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("10");
});

test("saved draft preserves normal browser Back and Forward", async ({ page }) => {
  await signIn(page);
  await page.goto("/activity-designs");
  await openIssuance(page, "history");
  await page.getByLabel("Meal pax", { exact: true }).fill("15");
  await addRecipe(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByRole("link", { name: "Purchase Orders", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/);
  await traverseHistory(page, "back");
  await expect(page).toHaveURL(/\/meal-schedules\/[^/]+$/);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await traverseHistory(page, "back");
  await expect(page).toHaveURL(/\/activity-designs$/);
  await expect(page.getByRole("heading", { name: "Activity Designs", exact: true })).toBeVisible();
  await page.waitForLoadState("domcontentloaded");
  await traverseHistory(page, "forward");
  await expect(page).toHaveURL(/\/meal-schedules\/[^/]+$/);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await traverseHistory(page, "forward");
  await expect(page).toHaveURL(/\/purchase-orders$/);
});

test.afterAll(cleanupIssuanceFixtures);
