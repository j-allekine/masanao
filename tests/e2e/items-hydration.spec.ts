import { expect, test } from "@playwright/test";

test("Item filters wait for hydration before accepting an interaction", async ({ page }) => {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/_next/**/*.js", async (route) => { await scripts; await route.continue(); });
  try {
    await page.goto("/items?itemsStatus=inactive", { waitUntil: "commit" });
    await expect(page.getByRole("combobox", { name: "Status filter", exact: true })).toBeDisabled();
    await expect(page.getByRole("combobox", { name: "Category filter", exact: true })).toBeDisabled();
    await expect(page.getByLabel("Search Items", { exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(page.locator('[data-items-ready="true"]')).toBeVisible();
  const status = page.getByRole("combobox", { name: "Status filter", exact: true });
  await expect(status).toBeEnabled();
  await status.click();
  await page.getByRole("option", { name: "All Statuses", exact: true }).click();
  await expect(page).toHaveURL(/\/items$/);
});
