import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

const activity = "/activity-designs/e2e-issuance-layout-design/activities/e2e-issuance-layout-activity";
const meal = `${activity}/meal-schedules/e2e-issuance-layout-meal`;
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-issuance-layout-design','AD-LAYOUT',2026,'Kitchen preparation',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,venue,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-issuance-layout-activity','e2e-issuance-layout-design','Community kitchen','Kitchen','Municipal hall',CURRENT_TIMESTAMP,75,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-issuance-layout-meal','e2e-issuance-layout-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('e2e-issuance-layout-po','PO-LAYOUT','po-layout','e2e-vendor-acme',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
});
test.afterAll(cleanupIssuanceFixtures);

test("long Meal Schedule breadcrumbs wrap without hiding controls at narrow widths", async ({ page }) => {
  test.setTimeout(120_000);
  const designNo = `AD-${"2026".repeat(20)}`;
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.prepare("UPDATE activity_design SET activityDesignNo=? WHERE id='e2e-issuance-layout-design'").run(designNo);
  db.close();
  try {
    expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
    await page.goto(meal);
    await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
    for (const width of [320, 406, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("link", { name: designNo, exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeInViewport();
    }
  } finally {
    const restore = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    restore.prepare("UPDATE activity_design SET activityDesignNo='AD-LAYOUT' WHERE id='e2e-issuance-layout-design'").run();
    restore.close();
  }
});

test("one Meal Schedule workspace preserves breadcrumbs, details, legacy links and guarded navigation", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  for (const [path, heading, screenshot] of [
    [activity, "Community kitchen", "01-activity-record.png"],
    ["/purchase-orders/e2e-issuance-layout-po", "PO-LAYOUT", "02-purchase-order.png"],
    ["/recipes", "Recipes", "03-recipe-catalog.png"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(screenshot), fullPage: true, animations: "disabled" });
  }
  await page.goto(`${meal}/issuance`);
  await expect(page).toHaveURL(new RegExp(`${meal}$`));
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lunch · 12:00", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Community kitchen", exact: true })).toHaveAttribute("href", activity);
  await expect(page.getByRole("link", { name: "Open issuance draft", exact: true })).toHaveCount(0);
  await expect(page.getByText("Meal Schedule context", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Municipal hall", { exact: true })).toHaveCount(0);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const trigger = page.getByRole("button", { name: "Additional details", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const details = page.locator('[data-slot="collapsible-content"]');
    await expect(details.getByText("Municipal hall", { exact: true })).toBeVisible();
    await expect(details.getByText("Kitchen", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`04-meal-details-${width}.png`), fullPage: true, animations: "disabled" });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`05-meal-workspace-${width}.png`), fullPage: true, animations: "disabled" });
  }
  await page.getByLabel("Meal pax", { exact: true }).fill("80");
  await page.getByRole("link", { name: "Community kitchen", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "Discard unsaved changes?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Meal pax", { exact: true })).toHaveValue("80");
  await page.getByRole("link", { name: "Community kitchen", exact: true }).click();
  await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${activity}$`));
});
