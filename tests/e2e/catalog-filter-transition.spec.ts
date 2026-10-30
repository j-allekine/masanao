import { expect, test } from "@playwright/test";
import { chooseCatalogFilter, openCatalogFilters } from "./catalog-filter-helpers";

test("filter breakpoints preserve selections and transfer focus to a visible equivalent", async ({ page, context }, info) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "sidebar_state", value: "true", url: process.env.BETTER_AUTH_URL! }]);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/items");
  const toolbar = page.getByRole("search");
  const search = page.getByRole("searchbox", { name: "Search Items", exact: true });
  async function width(target: number) {
    await page.setViewportSize({ width: target + 320, height: 900 });
    const actual = (await toolbar.boundingBox())!.width;
    await page.setViewportSize({ width: Math.round(target + 320 + target - actual), height: 900 });
    await expect.poll(async () => Math.round((await toolbar.boundingBox())!.width)).toBe(target);
    await expect(toolbar).toHaveAttribute("data-filter-layout", target < 760 ? "panel" : "inline");
  }
  await width(759);
  await search.fill("__keep_filter__");
  await expect(page).toHaveURL(/itemsSearch=__keep_filter__/);
  await chooseCatalogFilter(page, "Category filter", "Staples & Dry Goods");
  await chooseCatalogFilter(page, "Status filter", "Active only");
  await openCatalogFilters(page);
  const panel = page.getByRole("dialog", { name: "Filters", exact: true });
  await expect(panel).toHaveCSS("opacity", "1");
  await page.getByRole("combobox", { name: "Category filter", exact: true }).focus();
  await width(760);
  await expect(panel).toBeHidden();
  const category = toolbar.getByRole("combobox", { name: "Category filter", exact: true });
  await expect(category).toBeFocused();
  await expect(category).toContainText("Staples & Dry Goods");
  await expect(toolbar.getByRole("combobox", { name: "Status filter", exact: true })).toContainText("Active only");
  await expect(search).toHaveValue("__keep_filter__");
  for (const target of [761, 760, 759]) {
    await width(target);
    const samples = await toolbar.evaluate(async element => {
      const results = [];
      for (let i = 0; i < 8; i++) {
        await new Promise(requestAnimationFrame);
        results.push({ width: Math.round(element.getBoundingClientRect().width), layout: element.getAttribute("data-filter-layout"), copies: document.querySelectorAll("#item-category-filter").length });
      }
      return results;
    });
    for (const sample of samples) expect(sample).toEqual({ width: target, layout: target < 760 ? "panel" : "inline", copies: target < 760 ? 0 : 1 });
  }
  const trigger = toolbar.getByRole("button", { name: "Filters (2 active)", exact: true });
  await expect(trigger).toBeFocused();
  await openCatalogFilters(page);
  await expect(page.getByRole("combobox", { name: "Category filter", exact: true })).toContainText("Staples & Dry Goods");
  await page.getByRole("combobox", { name: "Status filter", exact: true }).click();
  await page.getByRole("option", { name: "Active only", exact: true }).focus();
  await width(761);
  await expect(panel).toBeHidden();
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(toolbar.getByRole("combobox", { name: "Status filter", exact: true })).toBeFocused();
  await expect(search).toHaveValue("__keep_filter__");
  await expect(page.getByText("No Items match your current filters.", { exact: true })).toBeVisible();
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: info.outputPath("filters-761-preserved-focus.png"), fullPage: true, animations: "disabled" });
  await toolbar.getByRole("combobox", { name: "Status filter", exact: true }).click();
  await page.getByRole("option", { name: "Active only", exact: true }).focus();
  await width(759);
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 1024, height: 600 });
  await expect(toolbar).toHaveAttribute("data-filter-layout", "panel");
  const sidebar = page.locator("header").getByRole("button", { name: "Toggle Sidebar", exact: true });
  await sidebar.click();
  await expect(toolbar).toHaveAttribute("data-filter-layout", "inline");
  await expect(search).toHaveValue("__keep_filter__");
  await sidebar.click();
  await expect(toolbar).toHaveAttribute("data-filter-layout", "panel");
  await openCatalogFilters(page);
  await expect(page.getByRole("combobox", { name: "Status filter", exact: true })).toContainText("Active only");
  await page.screenshot({ path: info.outputPath("filters-tablet-expanded-short.png"), fullPage: true, animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
