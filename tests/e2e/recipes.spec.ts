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

async function signInAsAdministrator(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "municipal.admin",
      password: "administrator-password",
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
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Recipe" })).toHaveCount(0);
});

test("lets an administrator create a Base Unit Recipe", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes");

  await page.getByRole("link", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await page.getByLabel("Recipe name").fill("Rice Porridge");
  await page.getByLabel("Preparation note").fill("Cook until soft.");
  await page.getByLabel("Ingredient 1 Item").click();
  await page.keyboard.type("Rice");
  await page.getByRole("option", { name: "Rice", exact: true }).click();
  await page.getByLabel("Ingredient 1 quantity").fill("2.5");
  await expect(page.getByText("Kilogram (kg)", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByText("Rice Porridge", { exact: true })).toBeVisible();
});

test("keeps the Recipes catalog readable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page);
  await page.goto("/recipes");

  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  const bodyWidths = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(bodyWidths.scrollWidth).toBeLessThanOrEqual(bodyWidths.clientWidth);
});
