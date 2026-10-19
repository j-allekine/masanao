import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

const designId = "e2e-issuance-long-details";
const activityId = `${designId}-activity`;
const designUrl = `/activity-designs/${designId}`;
const mealUrl = `${designUrl}/activities/${activityId}/meal-schedules/${designId}-meal`;
const office = "Municipal Community Welfare and Kitchen Operations Office ".repeat(4).slice(0, 200).trim();
const venue = "Community kitchen preparation and distribution hall near the municipal administration building ".repeat(4).slice(0, 300).trim();

test.beforeAll(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.transaction(() => {
      database.prepare("INSERT INTO activity_design (id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES (?,?,?,2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        .run(designId, "LONG-DETAILS", "Long details planning");
      database.prepare("INSERT INTO activity (id,activityDesignId,name,officeName,venue,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,75,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        .run(activityId, designId, "Community kitchen preparation", office, venue);
      database.prepare("INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,?,'Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        .run(`${designId}-meal`, activityId);
    })();
  } finally { database.close(); }
});

test.afterAll(cleanupIssuanceFixtures);

test.beforeEach(async ({ page }) => {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  });
  expect(response.status()).toBe(200);
});

test("mobile Activity facts wrap long Office names and keep row actions reachable", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(designUrl);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  const table = page.getByRole("table", { name: "Activities" });
  const mobileFacts = table.locator("dl");
  await expect(mobileFacts.getByText(office, { exact: true })).toBeVisible();
  expect(await table.locator("..").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Actions for Community kitchen preparation", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("long-office-mobile.png"), fullPage: true });
});

test("Activity record details wrap optional facts and support keyboard disclosure", async ({ page }, info) => {
  const particulars = "Arrange supplies and meal service for the community kitchen. ".repeat(12).trim();
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.prepare("UPDATE activity SET particulars = ?, plannedBudgetCentavos = 123456 WHERE id = ?").run(particulars, activityId);
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${designUrl}/activities/${activityId}`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(page.getByText(office, { exact: true })).toBeVisible();
      await expect(page.getByText("75", { exact: true })).toBeVisible();
      await expect(page.getByText("Scheduled date", { exact: true })).toBeVisible();
      const disclosure = page.getByRole("button", { name: "Additional details", exact: true });
      await expect(disclosure).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByText(venue, { exact: true })).not.toBeVisible();
      await disclosure.focus();
      await page.keyboard.press("Enter");
      await expect(disclosure).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByText(venue, { exact: true })).toBeVisible();
      await expect(page.getByText(particulars, { exact: true })).toBeVisible();
      await expect(page.getByText("Planned budget", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`activity-optional-details-${width}.png`), fullPage: true });
      await page.keyboard.press("Space");
      await expect(disclosure).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByText(office, { exact: true })).toBeVisible();
      await expect(page.getByText("75", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Activity Designs", exact: true })).toHaveAttribute("href", "/activity-designs");
    }
  } finally {
    database.prepare("UPDATE activity SET particulars = NULL, plannedBudgetCentavos = NULL WHERE id = ?").run(activityId);
    database.close();
  }
});

test("expanded meal details remain scrollable without hiding draft work or its footer", async ({ page }, info) => {
  test.setTimeout(90_000);
  for (const viewport of [{ width: 320, height: 640 }, { width: 320, height: 480 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto(mealUrl);
    await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
    const trigger = page.getByRole("button", { name: "Additional details", exact: true });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeInViewport();
    const details = page.locator('[data-slot="collapsible-content"]');
    await details.getByText(venue, { exact: true }).scrollIntoViewIfNeeded();
    await expect(details.getByText(venue, { exact: true })).toBeInViewport();
    const addRecipes = page.getByRole("button", { name: "Add Recipes", exact: true });
    await addRecipes.scrollIntoViewIfNeeded();
    await expect(addRecipes).toBeInViewport();
    await addRecipes.click();
    const picker = page.getByRole("dialog", { name: "Add Recipes", exact: true });
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "Done", exact: true }).click();
    await expect(picker).not.toBeVisible();
    const addStock = page.getByRole("button", { name: "Add Stock item", exact: true });
    await addStock.scrollIntoViewIfNeeded();
    await expect(addStock).toBeInViewport();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath(`expanded-work-${viewport.width}-${viewport.height}.png`), fullPage: true });
  }
});
