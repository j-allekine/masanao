import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { postFixtureSignIn } from "./fixture-auth";
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
  expect((await postFixtureSignIn(page.request, {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  const routes = [
    ["/dashboard", "Dashboard"], ["/overview", "Dashboard"], ["/activity-designs", "Planning"], ["/activities", "Planning"],
    ["/activity-designs/e2e-issuance-header-design", "Planning"], [activity, "Planning"],
    [`${activity}/meal-schedules/e2e-issuance-header-meal`, "Planning"],
    [`${activity}/meal-schedules/e2e-issuance-header-meal/issuance`, "Planning"],
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
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const header = page.locator('[data-slot="workspace-header"]');
      await expect(header).toHaveCount(1);
      await expect(header.getByText(title, { exact: true })).toBeVisible();
      await expect(header.getByRole("button", { name: "Toggle Sidebar", exact: true })).toHaveCount(1);
      await expect(header).toBeInViewport();
      expect(await header.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${width}-${index}.png`), fullPage: true, animations: "disabled" });
    }
  }
 });

test("shared header restores keyboard focus after mobile sidebar dismissal", async ({ page }) => {
  expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
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

for (const { route, link, title } of [
  { route: "/inventory", link: "Inventory", title: "Inventory" },
  { route: "/dashboard", link: "Dashboard", title: "Budget accounting" },
]) {
  test(`${link} keeps workspace orientation while navigation is loading`, async ({ page }, info) => {
    test.skip(!["1", "start"].includes(process.env.MASANAO_E2E_PRODUCTION ?? ""), "Route prefetch requires the production server");
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1024, height: 768 });
    expect((await postFixtureSignIn(page.request, {
      data: { username: "municipal.admin", password: "administrator-password" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    const prefetched = (headers: Record<string, string>) =>
      Boolean(headers["next-router-prefetch"] || headers["next-router-segment-prefetch"]);
    const fallbackResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === route && prefetched(response.request().headers()),
    );
    await page.goto("/items");
    const destination = page.getByRole("link", { name: link, exact: true });
    await destination.hover();
    await (await fallbackResponse).finished();

    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route((url) => url.pathname === route, async (requestRoute) => {
      const headers = requestRoute.request().headers();
      if (headers.rsc === "1" && !prefetched(headers)) await gate;
      await requestRoute.continue();
    });
    try {
      await destination.click();
      await expect(page.getByRole("status").filter({ hasText: "Loading workspace" })).toBeVisible();
      const toggle = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
      await expect(toggle).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole("button", { name: "Municipal Administrator account menu", exact: true })).toHaveCount(0);
      const loadingBounds = await toggle.boundingBox();
      await page.screenshot({ path: info.outputPath(`${link.toLowerCase()}-loading.png`) });
      release();
      await expect(page.getByRole("heading", { name: title, level: 1, exact: true })).toBeVisible();
      expect(await toggle.boundingBox()).toEqual(loadingBounds);
    } finally {
      release();
    }
  });
}

test("Inventory and Dashboard keep workspace orientation while recovering a failed read", async ({ page }) => {
  expect((await postFixtureSignIn(page.request, {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.setViewportSize({ width: 320, height: 480 });
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    for (const { route, table, title, orientation } of [
      { route: "/inventory", table: "item", title: "Inventory", orientation: "Supply Operations" },
      { route: "/dashboard", table: "activity", title: "Budget accounting", orientation: "Dashboard" },
    ]) {
      await page.goto(route);
      const heading = page.getByRole("heading", { level: 1, name: title });
      const toggle = page.getByRole("button", { name: "Toggle Sidebar", exact: true });
      await expect(heading).toBeVisible();
      const readyToggle = await toggle.boundingBox();
      db.exec(`ALTER TABLE "${table}" RENAME TO "unavailable_${table}"`);
      try {
        await page.reload();
        await expect(page.getByRole("alert").filter({ hasText: "Unable to load" })).toBeVisible();
        await expect(page.getByText(orientation, { exact: true })).toBeInViewport();
        await expect(toggle).toHaveCount(1);
        expect(await toggle.boundingBox()).toEqual(readyToggle);
      } finally {
        db.exec(`ALTER TABLE "unavailable_${table}" RENAME TO "${table}"`);
      }
      await page.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(heading).toBeVisible();
      await expect(toggle).toHaveCount(1);
    }
  } finally {
    db.close();
  }
});

test("collapsed desktop sidebar retains keyboard tooltips", async ({ page }) => {
  expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
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

test("workspace transitions clear account context on sign-out and session expiry", async ({ page }) => {
  const headers = { origin: process.env.BETTER_AUTH_URL! };
  expect((await postFixtureSignIn(page.request, {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers,
  })).status()).toBe(200);
  await page.goto("/items");
  const admin = page.getByRole("button", { name: "Municipal Administrator account menu", exact: true });
  const create = page.getByRole("button", { name: "Create Item", exact: true });
  await expect(create).toBeVisible();
  await admin.click();
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(admin).toHaveCount(0);
  await expect(create).toHaveCount(0);

  const signIn = await postFixtureSignIn(page.request, {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers,
  });
  expect(signIn.status()).toBe(200);
  const { token } = await signIn.json() as { token: string };
  await page.goto("/items");
  await expect(page.getByRole("button", { name: "Kitchen Staff account menu", exact: true })).toBeVisible();
  await expect(admin).toHaveCount(0);
  await expect(create).toHaveCount(0);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    expect(db.prepare("UPDATE session SET expiresAt = ? WHERE token = ?").run("2000-01-01T00:00:00.000Z", token).changes).toBe(1);
  } finally {
    db.close();
  }
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Toggle Sidebar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("form", { name: "Masanao staff sign in" })).toBeVisible();
});
