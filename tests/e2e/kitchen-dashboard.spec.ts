import { expect, test } from "@playwright/test";

test("budget-only Dashboard keeps authentication, dated bookmarks, pending period changes and validation usable", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/overview?start=2020-10-01&end=2020-10-31&view=stock");
  await expect(page).toHaveURL(/\/dashboard\?start=2020-10-01&end=2020-10-31&view=stock$/);
  await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Budget accounting", exact: true })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByText("No Activities scheduled in this period", { exact: true })).toBeVisible();
  await expect(page.locator("[data-dashboard-sample]")).toHaveCount(0);
  await page.getByRole("button", { name: "Reporting period", exact: true }).click();
  await page.getByLabel("From", { exact: true }).fill("2020-08-01");
  await page.getByLabel("To", { exact: true }).fill("2020-08-31");
  let releasePeriod = () => {};
  const periodResponse = new Promise<void>((resolve) => { releasePeriod = resolve; });
  await page.route("**/dashboard?start=2020-08-01**", async (route) => { await periodResponse; await route.continue(); }, { times: 1 });
  await page.getByRole("button", { name: "Apply period" }).click();
  try {
    await expect(page.getByRole("button", { name: "Reporting period", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Updating…", exact: true })).toBeDisabled();
  } finally { releasePeriod(); }
  await expect(page).toHaveURL(/start=2020-08-01&end=2020-08-31/);
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/dashboard?start=invalid&end=2020-10-31");
  await expect(page.getByRole("alert").filter({ hasText: "Report unavailable" })).toContainText("Choose valid dates");
});
