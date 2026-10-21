import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { chooseCatalogFilter, closeCatalogFilters, openCatalogFilters, resetCatalogFilters } from "./catalog-filter-helpers";

const catalogs = [
  ["inventory", "/inventory", "Search Inventory by Item name"],
  ["items", "/items", "Search Items"],
  ["recipes", "/recipes", "Search Recipes"],
  ["purchase-orders", "/purchase-orders", "Search Purchase Orders"],
  ["activity-designs", "/activity-designs", "Search Activity Designs"],
  ["activities", "/activities", "Search Activities"],
  ["units", "/master-data", "Search Units"],
  ["categories", "/master-data?tab=categories", "Search Categories"],
  ["offices", "/master-data?tab=offices", "Search Offices"],
  ["vendors", "/master-data?tab=vendors", "Search Vendors"],
] as const;

for (const width of [1280, 1024, 320]) {
  test(`catalog filters share visible labels and keyboard clearing at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    expect((await page.request.post("/api/auth/sign-in/username", {
      data: { username: "municipal.admin", password: "administrator-password" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    const evidence = process.env.MASANAO_FILTER_EVIDENCE_DIR;
    if (evidence) mkdirSync(evidence, { recursive: true });
    for (const [name, url, label] of catalogs) {
      await page.goto(url);
      const toolbar = page.getByRole("search");
      const search = toolbar.getByRole("searchbox", { name: label, exact: true });
      await expect(search).toBeEnabled();
      await expect(toolbar.locator("label", { hasText: /^Search$/ })).toBeVisible();
      await expect(toolbar).toHaveAttribute("data-filter-layout", /^(inline|panel|search)$/);
      const searchBox = await toolbar.locator('[data-slot="input-group"]').boundingBox();
      for (const select of await toolbar.getByRole("combobox").all()) {
        const selectBox = await select.boundingBox();
        expect(Math.abs(selectBox!.height - searchBox!.height)).toBeLessThanOrEqual(1);
        expect(Math.abs(selectBox!.y - searchBox!.y)).toBeLessThanOrEqual(1);
      }
      await search.fill("__no_matching_catalog_record__");
      const clear = toolbar.getByRole("button", { name: "Clear search", exact: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({
        path: evidence ? join(evidence, `${name}-${width}.png`) : testInfo.outputPath(`${name}-${width}.png`),
        fullPage: true,
      });
      await search.press("Tab");
      await expect(clear).toBeFocused();
      await clear.press("Enter");
      await expect(search).toHaveValue("");
      await expect(search).toBeFocused();
      await expect(clear).toHaveCount(0);
    }
  });
}

test("compact filters preserve selections, reset and focus while the available width changes", async ({ page }) => {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/items");
  const toolbar = page.getByRole("search");
  await expect(toolbar).toHaveAttribute("data-filter-layout", "panel");
  await chooseCatalogFilter(page, "Category filter", "Staples & Dry Goods");
  await chooseCatalogFilter(page, "Status filter", "Active only");
  const trigger = toolbar.getByRole("button", { name: "Filters (2 active)", exact: true });
  await expect(trigger).toBeFocused();
  await openCatalogFilters(page);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await openCatalogFilters(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(toolbar).toHaveAttribute("data-filter-layout", "inline");
  await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toHaveCount(0);
  await expect(toolbar.getByRole("combobox", { name: "Category filter", exact: true })).toContainText("Staples & Dry Goods");
  await expect(toolbar.getByRole("combobox", { name: "Status filter", exact: true })).toContainText("Active only");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 800 });
  await resetCatalogFilters(page);
  await expect(page).toHaveURL(/\/items$/);
  await expect(toolbar.getByRole("button", { name: "Filters", exact: true })).toBeFocused();
  await openCatalogFilters(page);
  await expect(page.getByRole("combobox", { name: "Category filter", exact: true })).toContainText("All Categories");
  await expect(page.getByRole("combobox", { name: "Status filter", exact: true })).toContainText("All Statuses");
  await closeCatalogFilters(page);
});
