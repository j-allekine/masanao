import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
    },
    headers: { origin: "http://localhost:3019" },
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
      page.getByRole("link", { name: "Activity Designs", exact: true }),
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

  test("shows the local Planning sections with Activities enabled", async ({ page }) => {
    await signIn(page);
    await page.goto("/activity-designs");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();

    await expect(
      page.getByRole("main").getByText("Planning", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Planning", exact: true }),
    ).toHaveCount(0);
    const planningMenu = page.getByRole("navigation", { name: "Planning sections" });
    const activePlanningLink = planningMenu.getByRole("link", {
      name: "Activity Designs",
      exact: true,
    });
    await expect(activePlanningLink).toBeVisible();
    await expect(activePlanningLink).toHaveAttribute("aria-current", "page");
    await expect(planningMenu.getByText("Activities", { exact: true })).toBeVisible();
    await expect(planningMenu.getByText("Meal Schedules", { exact: true })).toBeVisible();
    await expect(planningMenu.getByText("Coming later", { exact: true })).toHaveCount(1);
    await expect(
      planningMenu.getByRole("link", { name: "Activities", exact: true }),
    ).toBeVisible();
    await expect(
      planningMenu.getByRole("link", { name: "Meal Schedules", exact: true }),
    ).toHaveCount(0);
  });

  test("opens the Activities workspace from its dedicated destination", async ({ page }) => {
    await signIn(page);
    await page.goto("/activities");

    await expect(page).toHaveURL(/\/activities$/);
    await expect(page.getByRole("searchbox", { name: "Search Activities", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Activities", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByText("Coming later", { exact: true })).toHaveCount(1);
  });
});
