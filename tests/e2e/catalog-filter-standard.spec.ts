import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

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
      await expect(toolbar.locator("label", { hasText: label })).toBeVisible();
      const searchBox = await toolbar.locator('[data-slot="input-group"]').boundingBox();
      for (const select of await toolbar.getByRole("combobox").all()) {
        const selectBox = await select.boundingBox();
        expect(Math.abs(selectBox!.height - searchBox!.height)).toBeLessThanOrEqual(1);
      }
      await search.fill("__no_matching_catalog_record__");
      await search.press("Tab");
      const clear = toolbar.getByRole("button", { name: "Clear search", exact: true });
      await expect(clear).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({
        path: evidence ? join(evidence, `${name}-${width}.png`) : testInfo.outputPath(`${name}-${width}.png`),
        fullPage: true,
      });
      await clear.press("Enter");
      await expect(search).toHaveValue("");
      await expect(search).toBeFocused();
      await expect(clear).toHaveCount(0);
    }
  });
}
