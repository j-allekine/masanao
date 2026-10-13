import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

const mealPath =
  "/activity-designs/e2e-post-design/activities/e2e-post-activity/meal-schedules/e2e-post-meal";
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-post-design','AD-POST',2026,'Posting training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-post-activity','e2e-post-design','Supply preparation','Kitchen',CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-post-meal','e2e-post-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,isActive,issuanceQuantityPolicy,createdAt,updatedAt) VALUES ('e2e-post-eggs','Posting Eggs','posting eggs','default-category-staples-dry-goods','default-unit-piece',1,'whole-only',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('e2e-post-recipe','Posting Omelet','posting omelet',2,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe_ingredient (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-post-ingredient','e2e-post-recipe','e2e-post-eggs','37',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('e2e-post-vendor','Posting Vendor','posting vendor',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('e2e-post-po','POST-PO','post-po','e2e-post-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES ('e2e-post-dr','e2e-post-po','e2e-post-vendor','Posting Vendor','POST-PO','POST-DR','post-dr',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES ('e2e-post-dr-line','e2e-post-dr','e2e-post-eggs','default-unit-piece','default-unit-piece','Posting Eggs','Piece','Piece','20','1','20');
    INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('e2e-post-in','e2e-post-dr-line','e2e-post-eggs','default-unit-piece','20','stock-in',CURRENT_TIMESTAMP);
  `);
  db.close();
});

test("staff posts saved exact quantities with keyboard confirmation, shortage recovery and immutable desktop/mobile history", async ({
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
  await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
  await page.getByLabel("Search Recipes").fill("Posting Omelet");
  await page.getByRole("checkbox", { name: "Posting Omelet" }).check();
  await page.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Add Recipes" }).getByRole("heading", { name: /Already added/ })).toBeVisible();
  await page.getByRole("dialog", { name: "Add Recipes" }).getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "Post issuance", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Confirm the unresolved" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review quantities and stock" })
    .click();
  const review = page.getByRole("dialog", {
    name: "Combined quantities and stock",
  });
  await review
    .getByRole("button", { name: "Adjust issued quantity for Posting Eggs" })
    .click();
  await review.getByLabel("Final quantity for Posting Eggs").fill("19");
  await review.getByRole("button", { name: "Confirm quantity" }).click();
  await page.keyboard.press("Escape");
  // No separate Save click: posting must persist the new final quantity first.
  await page
    .getByRole("button", { name: "Post issuance", exact: true })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Post issuance?",
    exact: true,
  });
  await expect(confirm.getByText("19 pc", { exact: true })).toBeVisible();
  await expect(
    confirm.getByText(
      /No correction, reversal, return, or replacement posting/,
    ),
  ).toBeVisible();
  await expect(
    confirm.getByRole("button", { name: "Confirm and post issuance" }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("desktop-post-confirmation.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Post issuance", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Post issuance", exact: true })
    .click();
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.prepare(
    "UPDATE inventory_ledger_movement SET quantity='18' WHERE id='e2e-post-in'",
  ).run();
  await confirm
    .getByRole("button", { name: "Confirm and post issuance" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    confirm.getByRole("alert").filter({ hasText: /Posting Eggs/ }),
  ).toBeVisible();
  expect(
    db
      .prepare(
        "SELECT count(*) AS count FROM inventory_ledger_movement WHERE itemId='e2e-post-eggs' AND movementType='stock-out'",
      )
      .get(),
  ).toEqual({ count: 0 });
  await page.setViewportSize({ width: 320, height: 720 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-post-shortage.png"),
    fullPage: true,
  });
  db.prepare(
    "UPDATE inventory_ledger_movement SET quantity='20' WHERE id='e2e-post-in'",
  ).run();
  await confirm
    .getByRole("button", { name: "Confirm and post issuance" })
    .click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");
  await expect(
    page.getByRole("heading", { name: "Issued quantities" }),
  ).toBeVisible();
  await expect(page.getByText("19 pc", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Post issuance", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveCount(0);
  expect(
    db
      .prepare(
        "SELECT quantity FROM inventory_ledger_movement WHERE itemId='e2e-post-eggs' AND movementType='stock-out'",
      )
      .all(),
  ).toEqual([{ quantity: "19" }]);
  db.exec(
    "UPDATE item SET name='Renamed Eggs',issuanceQuantityPolicy='allow-decimals' WHERE id='e2e-post-eggs'; UPDATE recipe SET name='Renamed Omelet' WHERE id='e2e-post-recipe'; UPDATE meal_schedule SET label='Renamed meal' WHERE id='e2e-post-meal'; UPDATE activity SET name='Renamed activity' WHERE id='e2e-post-activity';",
  );
  await page.reload();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Lunch · 12:00" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Posting Eggs", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Posting Omelet · 1 pax" }),
  ).toBeVisible();
  await expect(
    page.getByText("Policy at posting: Whole quantities only"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-posted-history.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("dialog", { name: "Posting Omelet", exact: true }),
  ).toHaveCount(0);
  const ingredientsButton = page.getByRole("button", {
    name: "View ingredients for Posting Omelet",
  });
  await ingredientsButton.focus();
  await page.keyboard.press("Enter");
  const ingredients = page.getByRole("dialog", {
    name: "Posting Omelet",
    exact: true,
  });
  await expect(
    ingredients.getByRole("columnheader", { name: "Baseline (2 pax)" }),
  ).toBeVisible();
  await expect(
    ingredients.getByRole("columnheader", { name: "To issue (1 pax)" }),
  ).toBeVisible();
  await expect(
    ingredients.getByRole("cell", { name: "37 pc", exact: true }),
  ).toBeVisible();
  await expect(
    ingredients.getByRole("cell", { name: "18.5 pc", exact: true }),
  ).toBeVisible();
  await expect(
    ingredients.getByText(
      /Combined total adjusted. This contribution remains calculated/,
    ),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await ingredients.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  await page.screenshot({
    path: testInfo.outputPath("mobile-posted-ingredients.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(ingredientsButton).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath("desktop-posted-history.png"),
    fullPage: true,
  });
  await ingredientsButton.click();
  await expect(
    ingredients.getByRole("cell", { name: "18.5 pc", exact: true }),
  ).toBeVisible();
  await ingredients.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
  await page.screenshot({
    path: testInfo.outputPath("desktop-posted-ingredients.png"),
    fullPage: true,
  });
  await ingredients
    .getByRole("link", { name: "View issued quantities" })
    .click();
  await expect(ingredients).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Issued quantities" }),
  ).toBeFocused();
  await expect(page.getByText("19 pc", { exact: true })).toBeVisible();
  db.close();
});
