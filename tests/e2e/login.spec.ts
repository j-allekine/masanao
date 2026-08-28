import { expect, test } from "@playwright/test";

test("renders a production login without prototype controls", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("main", { name: "Masanao staff sign-in" }),
  ).toBeVisible();
  await expect(page.getByRole("form", { name: "Masanao staff sign in" })).toBeVisible();
  await expect(page.getByText(/prototype/i)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show password" }),
  ).toBeVisible();
});

test("redirects an unauthenticated overview visit to login", async ({ page }) => {
  await page.goto("/overview");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("main", { name: "Masanao staff sign-in" }),
  ).toBeVisible();
});
