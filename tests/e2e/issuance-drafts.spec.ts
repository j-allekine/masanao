import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

const mealPath =
  "/activity-designs/e2e-issuance-design/activities/e2e-issuance-activity/meal-schedules/e2e-issuance-meal";
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-issuance-design','AD-ISSUANCE',2026,'Kitchen training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-issuance-activity','e2e-issuance-design','Staff training','Kitchen',CURRENT_TIMESTAMP,100,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-issuance-meal','e2e-issuance-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('e2e-issuance-recipe','Training Rice','training rice',50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe_ingredient (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-issuance-rice','e2e-issuance-recipe','e2e-recipe-item-rice','1.5',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
  db.close();
});

test("staff prepares, saves and reopens a Recipe draft with keyboard and mobile controls", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: "correct-horse-battery-staple",
    },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  });
  expect(response.status()).toBe(200);
  await page.goto(mealPath);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("100");
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add Recipes" }).getByLabel("Meal pax", { exact: true })).toHaveValue("100");
  await page.getByLabel("Search Recipes").fill("Training Rice");
  const recipe = page.getByRole("checkbox", { name: "Training Rice" });
  await recipe.focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add Recipes" }).getByRole("heading", { name: /Already added/ })).toBeVisible();
  await page.getByRole("dialog", { name: "Add Recipes" }).getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "View ingredients for Training Rice", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "View ingredients for Training Rice", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "3 kg", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop-ingredients.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "View ingredients for Training Rice", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: "View ingredients for Training Rice", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Meal pax", { exact: true }).fill("125");
  await expect(page.getByText("125 pax", { exact: true })).toBeVisible();
  await page.getByLabel("Actions for Training Rice").click();
  await page.getByRole("menuitem", { name: "Adjust target pax" }).click();
  await page.getByLabel("Target pax", { exact: true }).fill("75");
  await page.getByRole("button", { name: "Apply target" }).click();
  await page.getByLabel("Meal pax", { exact: true }).fill("");
  await expect(page.getByText("75 pax", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.setViewportSize({ width: 320, height: 720 });
  await page
    .getByRole("button", { name: "View ingredients for Training Rice", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "2.25 kg", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("mobile-ingredients.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "View ingredients for Training Rice", exact: true }),
  ).toBeFocused();
  await page.getByLabel("Meal pax", { exact: true }).fill("0");
  await expect(page.getByRole("button", { name: "Save draft" })).toBeDisabled();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter a whole number" }),
  ).toContainText("Enter a whole number");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-validation.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Staff training", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Discard unsaved changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/meal-schedules\/[^/]+$/);
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("");
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  expect(
    db
      .prepare(
        "SELECT count(*) AS count FROM inventory_ledger_movement AS movement JOIN issuance_item_total AS total ON total.id = movement.issuanceItemTotalId JOIN issuance_record AS record ON record.id = total.issuanceRecordId WHERE movement.movementType = 'stock-out' AND record.mealScheduleId = 'e2e-issuance-meal'",
      )
      .get(),
  ).toEqual({ count: 0 });
  db.close();
});

test.afterAll(cleanupIssuanceFixtures);
