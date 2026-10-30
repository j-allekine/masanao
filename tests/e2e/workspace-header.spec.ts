import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

const activity = "/activity-designs/e2e-issuance-header-design/activities/e2e-issuance-header-activity";

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec(`
      INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-issuance-header-design','AD-HEADER',2026,'Header example',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES ('e2e-issuance-header-activity','e2e-issuance-header-design','Header activity','Kitchen',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-issuance-header-meal','e2e-issuance-header-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('e2e-issuance-header-po','PO-HEADER','po-header','e2e-vendor-acme',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    `);
  } finally { db.close(); }
});
test.afterAll(cleanupIssuanceFixtures);

test("every workspace family retains one shared header and usable mobile navigation", async ({ page }, info) => {
  test.setTimeout(180_000);
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  const routes = [
    ["/dashboard", "Dashboard"], ["/activity-designs", "Planning"], ["/activities", "Planning"],
    ["/activity-designs/e2e-issuance-header-design", "Planning"], [activity, "Planning"],
    [`${activity}/meal-schedules/e2e-issuance-header-meal`, "Planning"],
    ["/inventory", "Supply Operations"], ["/items", "Supply Operations"], ["/recipes", "Supply Operations"],
    ["/recipes/e2e-recipe-active", "Supply Operations"], ["/recipes/new", "Supply Operations"],
    ["/recipes/e2e-recipe-active/edit", "Supply Operations"],
    ["/purchase-orders", "Supply Operations"], ["/purchase-orders/e2e-issuance-header-po", "Supply Operations"],
    ["/master-data", "Master Data"],
  ];
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    for (const [index, [path, title]] of routes.entries()) {
      await page.goto(path);
      await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      const skip = page.getByRole("link", { name: "Skip to main content", exact: true });
      await skip.focus();
      await expect(skip).toBeInViewport();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("main")).toBeFocused();
      const header = page.locator('[data-slot="workspace-header"]');
      await expect(header).toHaveCount(1);
      await expect(header.getByText(title, { exact: true })).toBeVisible();
      await expect(header.getByRole("button", { name: "Toggle Sidebar", exact: true })).toHaveCount(1);
      await expect(header).toBeInViewport();
      expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      for (const position of [0.5, 1]) {
        await page.evaluate((fraction) => {
          const body = document.querySelector('[data-workspace-scroll="body"]');
          if (body) body.scrollTop = (body.scrollHeight - body.clientHeight) * fraction;
          else window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * fraction);
        }, position);
        await expect(header).toBeInViewport({ ratio: 1 });
        expect(await header.evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
        await page.screenshot({ path: info.outputPath(`${width}-${index}-scroll-${position}.png`), animations: "disabled" });
      }
      await page.screenshot({ path: info.outputPath(`${width}-${index}.png`), fullPage: true, animations: "disabled" });
    }
  }
 });

test("Dashboard report controls scroll while the measured compact header clears keyboard focus", async ({ page }, info) => {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/dashboard");
  await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible();
  const header = page.locator('[data-slot="workspace-header"]');
  const reportHeading = page.getByRole("heading", { name: "Budget accounting", exact: true });
  const headingTop = await reportHeading.evaluate((element) => element.getBoundingClientRect().top);
  const refresh = page.getByRole("button", { name: "Refresh", exact: true });
  const refreshTop = await refresh.evaluate((element) => element.getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(header).toBeInViewport({ ratio: 1 });
  expect(await reportHeading.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(headingTop);
  expect(await refresh.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(refreshTop);
  await page.screenshot({ path: info.outputPath("dashboard-short-scrolled.png"), animations: "disabled" });

  // Text enlargement must change clearance with the rendered header, rather
  // than leave keyboard focus under a fixed 64px offset.
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(64);
  await expect.poll(() => page.evaluate(() => {
    const headerHeight = document.querySelector('[data-slot="workspace-header"]')!.getBoundingClientRect().height;
    return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) - headerHeight;
  })).toBeGreaterThanOrEqual(31);
  const search = page.getByRole("searchbox", { name: "Search Activities by name or Office", exact: true });
  await search.focus();
  await search.evaluate((element) => element.scrollIntoView({ block: "start" }));
  expect(await search.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(await header.evaluate((element) => element.getBoundingClientRect().bottom));
  await page.screenshot({ path: info.outputPath("dashboard-enlarged-header-focus.png"), animations: "disabled" });
});

test("shared header restores keyboard focus after mobile sidebar dismissal", async ({ page }) => {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/dashboard");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const toggle = page.locator('[data-slot="workspace-header"]').getByRole("button", { name: "Toggle Sidebar", exact: true });
  await toggle.focus();
  await page.keyboard.press("Enter");
  const sidebar = page.getByRole("dialog", { name: "Sidebar", exact: true });
  await expect(sidebar).toBeVisible();
  await expect.poll(() => sidebar.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expect(sidebar).not.toHaveAttribute("data-starting-style");
  await sidebar.getByRole("link", { name: "Dashboard", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(sidebar).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("collapsed desktop sidebar retains keyboard tooltips", async ({ page }) => {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/dashboard");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.locator('[data-slot="workspace-header"]').getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await expect(page.locator('[data-state="collapsed"][data-slot="sidebar"]')).toBeVisible();
  await page.getByRole("link", { name: "Dashboard", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Planning", exact: true })).toBeFocused();
  await expect(page.getByRole("tooltip").getByText("Planning", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
});

test("failed reads retain anonymous orientation and recover through Retry", async ({ page }, info) => {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec('ALTER TABLE item RENAME TO item_unavailable_for_header_test');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/items");
    await expect(page.getByRole("heading", { level: 1, name: "Unable to load Items" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /account menu/ })).toHaveCount(0);
    await expect(page.getByText("Workspace unavailable", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath("items-error-anonymous-320.png"), fullPage: true });
  } finally {
    db.exec('ALTER TABLE item_unavailable_for_header_test RENAME TO item');
    db.close();
  }
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Items", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Municipal Administrator account menu" })).toBeVisible();
});

test("unknown routes have one anonymous main heading", async ({ page }, info) => {
  await page.goto("/missing-workspace-page");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await page.getByRole("link", { name: "Open workspace", exact: true }).click();
  await expect(page.getByRole("main", { name: "Masanao staff sign-in" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("unauthenticated-fallback.png"), fullPage: true });
});
