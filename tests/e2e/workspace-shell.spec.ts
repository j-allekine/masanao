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
    for (const path of ["/dashboard", "/activity-designs", "/activities", "/inventory", "/items", "/recipes", "/purchase-orders", "/master-data"]) {
      await page.goto(path);
      await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
      const sidebar = page.locator('[data-slot="sidebar"][data-state]');
      if (await sidebar.getAttribute("data-state") !== "collapsed") {
        await page.locator('[data-slot="sidebar-trigger"]').click();
      }
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
