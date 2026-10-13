import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

const mealPath =
  "/activity-designs/e2e-review-design/activities/e2e-review-activity/meal-schedules/e2e-review-meal";
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-review-design','AD-REVIEW',2026,'Review training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-review-activity','e2e-review-design','Quantity preparation','Kitchen',CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-review-meal','e2e-review-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,isActive,issuanceQuantityPolicy,createdAt,updatedAt) VALUES ('e2e-review-eggs','Review Eggs','review eggs','default-category-staples-dry-goods','default-unit-piece',1,'whole-only',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('e2e-review-recipe','Review Omelet','review omelet',3,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe_ingredient (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-review-ingredient','e2e-review-recipe','e2e-review-eggs','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
  db.close();
});

test("combined review preserves repeating contributions, exact confirmations, locks and explicit reset on desktop and mobile", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  expect(
    (
      await page.request.post("/api/auth/sign-in/username", {
        data: {
          username: "kitchen.staff",
          password: "correct-horse-battery-staple",
        },
        headers: { origin: process.env.BETTER_AUTH_URL! },
      })
    ).status(),
  ).toBe(200);
  await page.goto(mealPath);
  await page.getByRole("link", { name: "Open issuance draft" }).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("menuitem", { name: "Recipe", exact: true }).click();
  await page.getByLabel("Search Recipes").fill("Review Omelet");
  await page.getByRole("checkbox", { name: "Review Omelet" }).check();
  await page.getByRole("button", { name: "Add selected Recipes" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "require confirmation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review Omelet", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "≈ 0.333333 pc", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Review quantities and stock" })
    .click();
  const review = page.getByRole("dialog", {
    name: "Combined quantities and stock",
  });
  await expect(review.getByText("0.333333 pc", { exact: true })).toBeVisible();
  await expect(
    review.getByText(/whole-only Item has a fractional total/),
  ).toBeVisible();
  await review
    .getByRole("button", { name: "Adjust issued quantity for Review Eggs" })
    .click();
  await review.getByLabel("Final quantity for Review Eggs").fill("0.5");
  await review.getByRole("button", { name: "Confirm quantity" }).click();
  await expect(
    review.getByText("Enter a positive whole quantity for this Item."),
  ).toBeVisible();
  await review.getByLabel("Final quantity for Review Eggs").fill("1");
  await review.getByRole("button", { name: "Confirm quantity" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    review.getByText(/Reset this confirmation before changing demand/),
  ).toBeVisible();
  await expect(
    review.getByText("Shortage: required 1 pc; available 0 pc."),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("desktop-combined-review.png"),
    fullPage: true,
  });
  await review
    .getByRole("button", { name: "Reset adjustment for Review Eggs" })
    .click();
  await review
    .getByRole("button", { name: "Adjust issued quantity for Review Eggs" })
    .click();
  await review.getByLabel("Final quantity for Review Eggs").fill("1");
  await review.getByRole("button", { name: "Confirm quantity" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Review quantities and stock" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${mealPath}$`));
  await page.getByRole("link", { name: "Open issuance draft" }).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${mealPath}$`));
  await page.getByRole("link", { name: "Open issuance draft" }).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await page.reload();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Meal pax", { exact: true }).fill("2");
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("1");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Reset the adjustment for Review Eggs" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review Omelet", exact: true })
    .click();
  await expect(
    page.getByText("Combined total adjusted. Contribution remains calculated."),
  ).toBeVisible();
  await page.getByRole("button", { name: "View combined review" }).click();
  await review
    .getByRole("button", { name: "Reset adjustment for Review Eggs" })
    .click();
  await page.keyboard.press("Escape");
  await page.getByLabel("Meal pax", { exact: true }).fill("2");
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.prepare(
    "UPDATE item SET issuanceQuantityPolicy='allow-decimals' WHERE id='e2e-review-eggs'",
  ).run();
  await page.reload();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await page.setViewportSize({ width: 320, height: 720 });
  await page
    .getByRole("button", { name: "Review quantities and stock" })
    .click();
  await review
    .getByRole("button", { name: "Adjust issued quantity for Review Eggs" })
    .click();
  await review
    .getByLabel("Final quantity for Review Eggs")
    .fill("0.987654321123456789");
  await review.getByRole("button", { name: "Confirm quantity" }).click();
  await expect(
    review.getByText("0.987654321123456789 pc", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-exact-review.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  expect(
    db
      .prepare(
        "SELECT finalQuantity,adjusted FROM issuance_item_total WHERE itemId='e2e-review-eggs'",
      )
      .get(),
  ).toEqual({ finalQuantity: "0.987654321123456789", adjusted: 1 });
  await page
    .getByRole("button", { name: "Review quantities and stock" })
    .click();
  await review
    .getByRole("button", { name: "Adjust issued quantity for Review Eggs" })
    .click();
  await review.getByLabel("Final quantity for Review Eggs").fill("0.666667");
  await review.getByRole("button", { name: "Confirm quantity" }).click();
  await expect(review.getByText(/Save confirmation or reset/)).toBeVisible();
  await expect(
    review.getByRole("button", { name: "Reset adjustment for Review Eggs" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Meal pax", { exact: true }).fill("3");
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("2");
  await page
    .getByRole("button", { name: "Review quantities and stock" })
    .click();
  await review
    .getByRole("button", { name: "Reset adjustment for Review Eggs" })
    .click();
  await page.keyboard.press("Escape");
  await page.getByLabel("Meal pax", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Review quantities and stock" })
    .click();
  await expect(
    review.getByText(/Meal pax pending. This review is incomplete/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Discard unsaved changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/issuance$/);
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("");
  await page.goBack();
  await page
    .getByRole("dialog", { name: "Discard unsaved changes?" })
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${mealPath}$`));
  expect(
    db
      .prepare(
        "SELECT count(*) AS count FROM inventory_ledger_movement AS movement JOIN issuance_item_total AS total ON total.id = movement.issuanceItemTotalId JOIN issuance_record AS record ON record.id = total.issuanceRecordId WHERE movement.movementType = 'stock-out' AND record.mealScheduleId = 'e2e-review-meal'",
      )
      .get(),
  ).toEqual({ count: 0 });
  db.close();
});
