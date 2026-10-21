import Database from "better-sqlite3";
import { expect, test, type Page } from "@playwright/test";

const designId = "e2e-activities-catalog-states";

async function signIn(page: Page, username = "kitchen.staff") {
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username,
      password: username === "kitchen.staff" ? "correct-horse-battery-staple" : "administrator-password",
    },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  });
  expect(response.status()).toBe(200);
}

test("Activities catalog keeps empty, no-match, pagination and active-role actions usable at desktop and 320px", async ({ page }, info) => {
  test.setTimeout(120_000);
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    await signIn(page);
    // Global setup owns a fresh database; never delete existing rows to manufacture emptiness.
    expect(database.prepare("SELECT COUNT(*) AS count FROM activity").get()).toEqual({ count: 0 });
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/activities");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(page.getByText("No Activities yet.", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Activity", exact: true })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`catalog-empty-${width}.png`), fullPage: true });
    }

    database.prepare("INSERT INTO activity_design (id, activityDesignNo, title, fiscalYear, createdAt, updatedAt) VALUES (?, 'CATALOG-STATES', 'Cross-design parent identity', 2026, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").run(designId);
    const insert = database.prepare("INSERT INTO activity (id, activityDesignId, name, officeName, scheduledDate, createdAt, updatedAt) VALUES (?, ?, ?, 'Kitchen', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
    for (let index = 1; index <= 12; index++) {
      insert.run(`${designId}-${index}`, designId, `Catalog state Activity ${String(index).padStart(2, "0")}`);
    }

    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/activities");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const search = page.getByRole("searchbox", { name: "Search Activities", exact: true });
      await search.fill("Cross-design parent identity");
      await expect(page.getByText("Showing 1 to 10 of 12 results", { exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Activity Design title", exact: true })).toBeVisible();
      await expect(page.getByRole("row").filter({ hasText: "Catalog state Activity" }).first()).toContainText("Cross-design parent identity");
      const next = page.getByRole("button", { name: "Next page", exact: true });
      await next.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByText("Showing 11 to 12 of 12 results", { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/activitiesPage=2/);
      await expect(next).toBeDisabled();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`catalog-page-2-${width}.png`), fullPage: true });
      await search.fill("No matching Activity in this catalog");
      await expect(page.getByText("No Activities match your current search.", { exact: true })).toBeVisible();
      await expect(page.getByText("No results", { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`catalog-no-match-${width}.png`), fullPage: true });
      await page.getByRole("search").getByRole("button", { name: "Clear search", exact: true }).click();
      await expect(search).toBeEmpty();
      await expect(page.getByText("Showing 1 to 10 of 12 results", { exact: true })).toBeVisible();
    }

    // Planning has no read-only active role: both current staff and admin retain actions.
    for (const username of ["kitchen.staff", "municipal.admin"]) {
      await signIn(page, username);
      await page.goto("/activities?activitiesSearch=Catalog+state+Activity+01");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Activity", exact: true })).toBeVisible();
      const actions = page.getByRole("button", { name: "Actions for Catalog state Activity 01", exact: true });
      await actions.scrollIntoViewIfNeeded();
      await actions.click();
      await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(actions).toBeFocused();
    }
    await page.context().clearCookies();
    await page.goto("/activities");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Create Activity", exact: true })).toHaveCount(0);
  } finally {
    database.prepare("DELETE FROM activity WHERE activityDesignId = ?").run(designId);
    database.prepare("DELETE FROM activity_design WHERE id = ?").run(designId);
    database.close();
  }
});
