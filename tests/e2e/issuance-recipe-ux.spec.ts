import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

const path = "/activity-designs/e2e-ux-design/activities/e2e-ux-activity/meal-schedules/e2e-ux-meal/issuance";

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-ux-design','AD-UX',2026,'Kitchen review',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-ux-activity','e2e-ux-design','Meal preparation','Kitchen',CURRENT_TIMESTAMP,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-ux-meal','e2e-ux-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  for (const name of ["Alpha", "Beta"]) {
    db.prepare("INSERT INTO recipe (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES (?,?,?,10,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-ux-${name}`, `${name} Rice`, `${name.toLowerCase()} rice`);
    db.prepare("INSERT INTO recipe_ingredient (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES (?,?,'e2e-recipe-item-rice','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-ux-ingredient-${name}`, `e2e-ux-${name}`);
  }
  db.close();
});

test("whole Recipe cards, digits-only pax, persistent added list and save from review", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto(path);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  const meal = page.getByLabel("Meal pax", { exact: true });
  await meal.fill("10");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await expect(page.getByText("Add a Recipe or Stock item before saving your first draft.")).toBeVisible();
  await meal.press("End");
  await meal.press("a");
  await expect(meal).toHaveValue("10");
  await expect(page.getByText("Use digits only (0–9).", { exact: true })).toBeVisible();
  await meal.fill("0");
  await expect(page.getByText("Enter a whole number from 1 to 2,147,483,647.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeDisabled();
  await meal.fill("10");
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Recipes", exact: true });
  await picker.getByRole("checkbox", { name: "Use custom Recipe pax", exact: true }).check();
  const target = picker.getByLabel("Recipe pax", { exact: true });
  await target.fill("12x");
  await expect(target).toHaveValue("10");
  await picker.getByRole("checkbox", { name: "Use custom Recipe pax", exact: true }).uncheck();
  await picker.getByLabel("Search Recipes").fill("Alpha Rice");
  const alpha = picker.getByRole("checkbox", { name: "Alpha Rice", exact: true });
  const card = picker.locator("label").filter({ has: page.getByRole("checkbox", { name: "Alpha Rice", exact: true }) });
  // Click the card padding, away from the checkbox and Recipe name.
  await card.click({ position: { x: 150, y: 45 } });
  await expect(alpha).toBeChecked();
  await expect(picker.getByRole("region", { name: "Selected Recipes" }).getByText("Alpha Rice", { exact: true })).toBeVisible();
  await card.click({ position: { x: 150, y: 45 } });
  await expect(alpha).not.toBeChecked();
  await expect(picker.getByRole("region", { name: "Selected Recipes" })).toHaveCount(0);
  await alpha.focus();
  await page.keyboard.press("Space");
  await expect(alpha).toBeChecked();
  await picker.getByRole("button", { name: "Remove selection Alpha Rice", exact: true }).click();
  await expect(alpha).not.toBeChecked();
  await expect(alpha).toBeFocused();
  await page.keyboard.press("Space");
  await page.screenshot({ path: testInfo.outputPath("recipe-selected-preview.png"), fullPage: true });
  let release!: () => void;
  let requested!: () => void;
  const requestStarted = new Promise<void>((resolve) => { requested = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    requested();
    await released;
    await route.continue();
  }, { times: 1 });
  await picker.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await requestStarted;
  try {
    await expect(picker.getByRole("button", { name: "Done", exact: true })).toBeDisabled();
    await expect(picker.getByRole("button", { name: "Adding…", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(picker).toBeVisible();
  } finally {
    release();
  }
  const added = picker.getByRole("list", { name: "Already added Recipes" });
  await expect(added.getByText("Alpha Rice", { exact: true })).toBeVisible();
  await picker.getByLabel("Search Recipes").fill("Beta Rice");
  await expect(added.getByText("Alpha Rice", { exact: true })).toBeVisible();
  await picker.getByRole("checkbox", { name: "Beta Rice", exact: true }).check();
  await picker.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await expect(added.getByText("Beta Rice", { exact: true })).toBeVisible();
  await picker.getByLabel("Search Recipes").fill("zz-no-match");
  await expect(picker.getByText("No Recipes match your search.")).toBeVisible();
  await expect(added.getByText("Alpha Rice", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("recipe-search-added-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(picker).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("recipe-search-added-mobile.png"), fullPage: true });
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByLabel("Actions for Alpha Rice", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Adjust target pax" }).click();
  const custom = page.getByLabel("Target pax", { exact: true });
  await custom.fill("1.5");
  await expect(custom).toHaveValue("10");
  await custom.fill("20");
  await page.getByRole("button", { name: "Apply target", exact: true }).click();
  await page.getByRole("button", { name: "Review quantities and stock" }).click();
  const review = page.getByRole("dialog", { name: "Combined quantities and stock" });
  await review.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(review.getByRole("status")).toContainText("Draft saved");
  await review.getByRole("button", { name: "Close review" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "View ingredients for Alpha Rice", exact: true })).toBeVisible();
  await expect(page.getByText("Custom target", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "View ingredients for Beta Rice", exact: true })).toBeVisible();
});

test("pending Meal pax can be completed without leaving the Recipe picker", async ({ page }) => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec("INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-ux-pending','e2e-ux-activity','Dinner','18:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
  db.close();
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto(path.replace("e2e-ux-meal/", "e2e-ux-pending/"));
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByLabel("Meal pax", { exact: true }).fill("");
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Recipes", exact: true });
  await picker.getByLabel("Search Recipes").fill("Alpha Rice");
  await picker.getByRole("checkbox", { name: "Alpha Rice", exact: true }).check();
  await expect(picker.getByRole("button", { name: "Add 1 Recipe", exact: true })).toBeDisabled();
  await picker.getByLabel("Meal pax", { exact: true }).fill("15");
  await expect(picker.getByRole("button", { name: "Add 1 Recipe", exact: true })).toBeEnabled();
  await picker.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await expect(picker.getByRole("list", { name: "Already added Recipes" }).getByText("Alpha Rice", { exact: true })).toBeVisible();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("15");
});

test.afterAll(cleanupIssuanceFixtures);
