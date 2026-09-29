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

test("lets authenticated kitchen staff browse active Recipes only", async ({ page }) => {
  await signIn(page);
  await page.goto("/recipes");

  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Recipes", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  await expect(page.getByText("Retired Soup", { exact: true })).toHaveCount(0);
  await expect(
    page.locator('[data-recipe-id="e2e-recipe-active"]'),
  ).toContainText("Active");
});

test("searches, paginates, and clamps the active Recipes catalog", async ({ page }) => {
  await signIn(page);
  await page.goto("/recipes?recipesPage=99");

  await expect(page).toHaveURL(/\/recipes\?recipesPage=2$/);
  await expect(page.getByText("Zesty Recipe 10", { exact: true })).toBeVisible();
  await expect(page.getByText("Chicken Tinola", { exact: true })).toHaveCount(0);

  await page.getByLabel("Search Recipes").fill("  chicken   tinola ");
  await expect(page).toHaveURL(/recipesSearch=\+\+chicken\+\+\+tinola\+$/);
  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  await expect(page.getByText("Zesty Recipe 10", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();

  await page.getByLabel("Search Recipes").fill("not a recipe");
  await expect(page.getByText("No Recipes match your search.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page).toHaveURL("/recipes");
  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/recipes\?recipesPage=2$/);
  await expect(page.getByText("Zesty Recipe 10", { exact: true })).toBeVisible();
});

test("keeps the Recipes catalog readable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page);
  await page.goto("/recipes");

  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Search Recipes")).toBeVisible();
  const bodyWidths = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(bodyWidths.scrollWidth).toBeLessThanOrEqual(bodyWidths.clientWidth);
});
