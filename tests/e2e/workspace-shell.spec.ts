import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
    },
    headers: {
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3019",
    },
  });

  expect(response.status()).toBe(200);
}

test.describe("workspace shell", () => {
  test("keeps the full brand badge and account control inside the collapsed sidebar across modules", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/dashboard");
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    await page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
    for (const [label, path] of [["Dashboard", "/dashboard"], ["Planning", "/activity-designs"], ["Inventory", "/inventory"], ["Items", "/items"], ["Recipes", "/recipes"], ["Purchase Orders", "/purchase-orders"], ["Master Data", "/master-data"]]) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
      const sidebar = page.locator('[data-slot="sidebar"][data-state]').filter({ visible: true });
      await expect(sidebar).toHaveAttribute("data-state", "collapsed");
      const brand = page.getByRole("link", { name: "Masanao Municipal kitchen", exact: true });
      await expect(brand).toBeVisible();
      await expect.poll(() => brand.evaluate((element) => {
        const button = element.getBoundingClientRect();
        const badge = element.firstElementChild!.getBoundingClientRect();
        const rail = element.closest('[data-slot="sidebar-container"]')!.getBoundingClientRect();
        return badge.left >= button.left && badge.right <= button.right + 1 &&
          badge.top >= button.top && badge.bottom <= button.bottom + 1 &&
          button.left >= rail.left && button.right <= rail.right + 1 &&
          Math.abs((badge.left + badge.right) / 2 - (rail.left + rail.right) / 2) <= 1;
      }), { message: `The complete brand must fit and center in the collapsed sidebar on ${path}` }).toBe(true);
      const account = page.getByRole("button", { name: "Kitchen Staff account menu", exact: true });
      await account.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("menuitem", { name: "Log out", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
    }
    await page.goBack();
    await expect(page).toHaveURL(/\/purchase-orders$/);
    await expect(page.locator('[data-slot="sidebar"][data-state]').filter({ visible: true })).toHaveAttribute("data-state", "collapsed");
    await page.goForward();
    await page.reload();
    await expect(page.locator('[data-slot="sidebar"][data-state]').filter({ visible: true })).toHaveAttribute("data-state", "collapsed");
    await page.goto("/activities");
    await expect(page.locator('[data-slot="sidebar"][data-state]').filter({ visible: true })).toHaveAttribute("data-state", "collapsed");
  });

  test("shows only the current global destinations and retains the account menu", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/dashboard");
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Planning", exact: true }),
    ).toBeVisible();
    const inventory = page.getByRole("link", { name: "Inventory", exact: true });
    await expect(inventory).toBeVisible();
    await expect(inventory).toHaveAttribute("href", "/inventory");
    for (const removedDestination of [
      "Activities",
      "Schedule",
      "Deliveries",
      "Issuance",
      "Records",
      "Reports",
      "Staff accounts",
      "Settings",
    ]) {
      await expect(
        page.getByRole("link", { name: removedDestination, exact: true }),
      ).toHaveCount(0);
    }

    await page.getByRole("button", { name: /Kitchen Staff/ }).click();
    await expect(page.getByRole("menuitem", { name: "Log out", exact: true })).toBeVisible();
  });

  test("keeps Planning as the single hierarchy entry without placeholder sections", async ({ page }) => {
    await signIn(page);
    await page.goto("/activity-designs");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    const planning = page.getByRole("link", { name: "Planning", exact: true });
    await expect(planning).toHaveAttribute("href", "/activity-designs");
    await expect(planning).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Activity Designs", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Planning sections" })).toHaveCount(0);
    await expect(page.getByText("Coming later", { exact: true })).toHaveCount(0);
  });

  test("keeps legacy Activities bookmarks usable with Planning selected", async ({ page }) => {
    await signIn(page);
    await page.goto("/activities");
    await expect(page).toHaveURL(/\/activities$/);
    await expect(page.getByRole("searchbox", { name: "Search Activities", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Planning", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Activities", exact: true })).toHaveCount(0);
    await expect(page.getByText("Coming later", { exact: true })).toHaveCount(0);
  });
});


test("sidebar defaults and saved choices have the correct layout before hydration", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  for (const preference of [undefined, "invalid", "true", "false"]) {
    for (const width of [767, 768, 1023, 1024]) {
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 768 } });
      const page = await context.newPage();
      await signIn(page);
      if (preference !== undefined) await context.addCookies([{ name: "sidebar_state", value: preference, url: process.env.BETTER_AUTH_URL! }]);
      await page.goto("/items");
      const gap = page.locator('[data-slot="sidebar-gap"]').first();
      if (width < 768) {
        await expect(gap).toBeHidden();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      } else {
        const expanded = preference === "true" || (preference !== "false" && width >= 1024);
        await expect.poll(async () => (await gap.boundingBox())?.width).toBe(expanded ? 248 : 48);
      }
      if (preference === undefined && width === 768) await page.screenshot({ path: testInfo.outputPath("tablet-first-paint.png") });
      await context.close();
    }
  }
});

test("temporary mobile navigation preserves the desktop choice across viewport and destination changes", async ({ page }, testInfo) => {
  await signIn(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const trigger = page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true });
  await trigger.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Sidebar", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("link", { name: "Recipes", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByRole("heading", { level: 1, name: "Recipes", exact: true })).toBeFocused();
  await expect(page.getByRole("dialog", { name: "Sidebar", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Items", exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("mobile-destination.png") });
  await trigger.click();
  await page.setViewportSize({ width: 800, height: 768 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-slot="sidebar"][data-state]').filter({ visible: true })).toHaveAttribute("data-state", "collapsed");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const cookie = (await page.context().cookies()).find((cookie) => cookie.name === "sidebar_state");
  expect(cookie?.value).toBe("false");
  expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(6 * 24 * 60 * 60);
});


test("unavailable preference storage does not block in-session navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!;
    Object.defineProperty(document, "cookie", { get: () => cookie.get!.call(document), set: () => { throw new Error("Storage unavailable"); } });
  });
  await signIn(page);
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const trigger = page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("link", { name: "Recipes", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("account transitions refresh identity and allowed controls while retaining only navigation preference", async ({ page }) => {
  await signIn(page);
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Item", exact: true })).toHaveCount(0);
  await page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await page.getByRole("button", { name: "Kitchen Staff account menu", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Kitchen Staff account menu", exact: true })).toHaveCount(0);
  await page.goto("/items");
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Item", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kitchen Staff account menu", exact: true })).toHaveCount(0);
  await expect(page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Municipal Administrator account menu", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await signIn(page);
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Kitchen Staff account menu", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Item", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Municipal Administrator account menu", exact: true })).toHaveCount(0);
});
