import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

const designId = "e2e-issuance-activities-return";
const activityId = `${designId}-01`;
const catalog = "/activities?activitiesSearch=Catalog+Activity&activitiesPage=2";

test.beforeAll(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.transaction(() => {
      database.prepare("INSERT INTO activity_design (id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES (?,?,?,2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        .run(designId, "CATALOG-RETURN", "Catalog Return Design");
      const insert = database.prepare("INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES (?,?,?,'Kitchen',CURRENT_TIMESTAMP,75,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
      for (let index = 1; index <= 12; index++) {
        const number = String(index).padStart(2, "0");
        insert.run(`${designId}-${number}`, designId, `Catalog Activity ${number}`);
      }
      database.prepare("INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,?,'Catalog Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
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

test("Activities catalog opens records and preserves search/page through meals on desktop and mobile", async ({ page }, info) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(catalog);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.getByRole("link", { name: "Catalog Activity 01", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalog Activity 01", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Activities", exact: true })).toHaveAttribute("href", catalog);
    await page.getByRole("link", { name: "Open Meal Schedule: Catalog Lunch", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalog Lunch · 12:00", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Activities", exact: true }).click();
    await expect(page).toHaveURL(new RegExp("activitiesPage=2$"));
    await expect(page.getByRole("searchbox", { name: "Search Activities", exact: true })).toHaveValue("Catalog Activity");
    await expect(page.getByRole("link", { name: "Catalog Activity 01", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`activities-${width}.png`), fullPage: true });
  }
});

test("Activities links retain typed search before catalog navigation finishes", async ({ page }) => {
  await page.goto("/activities");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(
    (url) => url.pathname === "/activities" && url.searchParams.has("activitiesSearch"),
    async (route) => { await pending; await route.continue(); },
  );
  try {
    await page.getByRole("searchbox", { name: "Search Activities", exact: true }).fill("Catalog Activity 01");
    const query = new URLSearchParams({ planningReturn: "/activities?activitiesSearch=Catalog+Activity+01" });
    await expect(page.getByRole("link", { name: "Catalog Activity 01", exact: true }))
      .toHaveAttribute("href", `/activity-designs/${designId}/activities/${activityId}?${query}`);
  } finally { release(); }
  await expect(page).toHaveURL(/activitiesSearch=Catalog\+Activity\+01/);
});
