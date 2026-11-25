import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { expect, test, type Locator, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { postFixtureSignIn } from "./fixture-auth";

const path = "/activity-designs/e2e-ux-design/activities/e2e-ux-activity/meal-schedules/e2e-ux-meal";
const destructiveColor = "rgb(157, 65, 55)";
const rangeError = "Enter a whole number from 1 to 2,147,483,647.";
const digitsError = "Use digits only (0–9).";

async function expectRequiredPax(page: Page, input: Locator) {
  await expect(input).toHaveAttribute("required", "");
  const id = await input.getAttribute("id");
  const marker = page.locator(`label[for="${id}"] [aria-hidden="true"]`);
  await expect(marker).toBeVisible();
  await expect(marker).toHaveText("*");
  await expect(marker).toHaveCSS("color", destructiveColor);
}

async function expectHiddenPaxError(page: Page, input: Locator, description: string) {
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveCSS("border-top-color", destructiveColor);
  const escapedDescription = description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(input).toHaveAccessibleDescription(new RegExp(escapedDescription));
  const id = await input.getAttribute("id");
  const error = page.locator(`#${id}-error`);
  await expect(error).toHaveText(description);
  await expect(error).toHaveCSS("position", "absolute");
  await expect(error).toHaveCSS("clip-path", "inset(50%)");
}

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

test("Recipe cart, per-Recipe pax and save from review", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto(path);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await expect(page.getByText("New draft", { exact: true })).toBeVisible();
  await expect(page.getByText("Add a Recipe or Stock item before saving your first draft.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No stock has been issued.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No Recipes selected.", { exact: false })).toBeVisible();
  await expect(page.getByText("No Stock items selected.", { exact: false })).toBeVisible();
  const reviewButton = page.getByRole("button", { name: "Review", exact: true });
  await reviewButton.press("Enter");
  const emptyReview = page.getByRole("dialog", { name: "Combined quantities and stock", exact: true });
  await expect(emptyReview.getByText("No calculated Item quantities yet.")).toBeVisible();
  await emptyReview.getByRole("button", { name: "Close review", exact: true }).press("Enter");
  await expect(reviewButton).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("empty-draft.png"), animations: "disabled" });
  const meal = page.getByRole("textbox", { name: "Meal pax", exact: true });
  await expectRequiredPax(page, meal);
  await meal.fill("10");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await meal.press("End");
  await meal.press("a");
  await expect(meal).toHaveValue("10");
  await expectHiddenPaxError(page, meal, digitsError);
  await meal.fill("0");
  await expectHiddenPaxError(page, meal, rangeError);
  await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeDisabled();
  await meal.fill("10");
  await expect(meal).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Recipes", exact: true });
  await expect(picker.getByText("Meal pax ·", { exact: false })).toHaveCount(0);
  await picker.getByLabel("Search Recipes").fill("Alpha Rice");
  const alpha = picker.getByRole("button", { name: "Add Alpha Rice", exact: true });
  await alpha.click();
  await expect(picker.getByText("In cart", { exact: true })).toBeVisible();
  await picker.getByRole("button", { name: "Remove Alpha Rice", exact: true }).click();
  await expect(alpha).toBeEnabled();
  await alpha.click();
  const target = picker.getByRole("spinbutton", { name: "Alpha Rice pax" });
  await expect(target).toHaveValue("10");
  await target.fill("0");
  await expect(picker.getByRole("button", { name: "Add 1 Recipe" })).toBeDisabled();
  await target.fill("10");
  await picker.getByLabel("Search Recipes").fill("Beta Rice");
  await picker.getByRole("button", { name: "Add Beta Rice", exact: true }).click();
  await picker.getByRole("spinbutton", { name: "Beta Rice pax" }).fill("15");
  await picker.getByLabel("Search Recipes").fill("zz-no-match");
  await expect(picker.getByText("No Recipes match your search.")).toBeVisible();
  const cart = picker.getByRole("list", { name: "Recipes to add" });
  await expect(cart).toHaveCSS("overflow-y", "auto");
  await expect(cart.getByText("Alpha Rice", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("recipe-cart-mobile.png"), fullPage: true });
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
  const confirm = picker.getByRole("button", { name: "Add 2 Recipes", exact: true });
  await confirm.click();
  await requestStarted;
  try {
    await expect(picker.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(picker).toBeVisible();
  } finally {
    release();
  }
  await expect(picker).not.toBeVisible();
  await expect(page.getByRole("button", { name: "View ingredients for Beta Rice", exact: true })).toBeVisible();
  await page.getByLabel("Actions for Alpha Rice", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Adjust target pax" }).click();
  const custom = page.getByRole("textbox", { name: "Target pax", exact: true });
  await expectRequiredPax(page, custom);
  await custom.fill("1.5");
  await expect(custom).toHaveValue("10");
  await expectHiddenPaxError(page, custom, digitsError);
  await custom.fill("0");
  await expectHiddenPaxError(page, custom, rangeError);
  await expect(page.getByRole("button", { name: "Apply target", exact: true })).toBeDisabled();
  await custom.fill("20");
  await expect(custom).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Apply target", exact: true }).click();
  await reviewButton.click();
  const review = page.getByRole("dialog", { name: "Combined quantities and stock" });
  await review.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(review.getByRole("status")).toContainText("Draft saved");
  await review.getByRole("button", { name: "Close review" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "View ingredients for Alpha Rice", exact: true })).toBeVisible();
  await expect(page.getByText("Custom target", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "View ingredients for Beta Rice", exact: true })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Discard changes", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("saved-draft.png"), animations: "disabled" });
});

test("missing Meal pax is set on the draft before adding Recipes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec("INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-ux-pending','e2e-ux-activity','Dinner','18:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
  db.close();
  expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto(path.replace("e2e-ux-meal", "e2e-ux-pending"));
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.getByRole("textbox", { name: "Meal pax", exact: true }).fill("");
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Add Recipes", exact: true });
  await expect(picker.getByText("Enter Meal pax on the draft before adding Recipes.")).toBeVisible();
  await expect(picker.getByRole("button", { name: "Add Alpha Rice", exact: true })).toBeDisabled();
  await picker.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await page.getByRole("textbox", { name: "Meal pax", exact: true }).fill("15");
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  await picker.getByRole("button", { name: "Add Alpha Rice", exact: true }).click();
  await picker.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await expect(page.getByRole("textbox", { name: "Meal pax", exact: true })).toHaveValue("15");
});

test.afterAll(cleanupIssuanceFixtures);
