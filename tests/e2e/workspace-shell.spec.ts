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
  test("shows only the current global destinations and retains the account menu", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/overview");
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

    await expect(page.getByRole("link", { name: "Overview", exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Planning", exact: true }),
    ).toBeVisible();
    for (const removedDestination of [
      "Activities",
      "Schedule",
      "Inventory",
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
