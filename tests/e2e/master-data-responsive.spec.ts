import { expect, test, type Page } from "@playwright/test";
import { isolateMasterDataFixture } from "./master-data-fixtures";

let restore: (() => void) | undefined;
test.beforeEach(() => { restore = isolateMasterDataFixture(test.info().title); });
test.afterEach(() => { restore?.(); });

async function open(page: Page, admin = true) {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: admin ? { username: "municipal.admin", password: "administrator-password" } : { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.goto("/master-data");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.addStyleTag({ content: "nextjs-portal { display:none !important }" });
}

test("Master Data tabs keep complete geometry, manual keyboard activation and local history", async ({ page }, info) => {
  test.setTimeout(120_000);
  await open(page);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 600 });
    const list = page.getByRole("tablist", { name: "Master Data sections" });
    for (const name of ["Units", "Categories", "Offices", "Vendors"]) {
      const tab = list.getByRole("tab", { name, exact: true });
      await tab.focus();
      const bounds = await tab.evaluate(element => {
        const scroller = element.closest('[role="tablist"]')!.parentElement!;
        const box = element.getBoundingClientRect();
        const parent = scroller.getBoundingClientRect();
        return { height: box.height, left: box.left - parent.left, right: parent.right - box.right, top: box.top - parent.top, bottom: parent.bottom - box.bottom, overflow: scroller.scrollHeight - scroller.clientHeight };
      });
      expect(bounds.height).toBeGreaterThanOrEqual(40);
      expect(bounds.left).toBeGreaterThanOrEqual(3);
      expect(bounds.right).toBeGreaterThanOrEqual(3);
      expect(bounds.top).toBeGreaterThanOrEqual(3);
      expect(bounds.bottom).toBeGreaterThanOrEqual(3);
      expect(bounds.overflow).toBeLessThanOrEqual(1);
      await page.keyboard.press("Enter");
      await expect(tab).toHaveAttribute("aria-selected", "true");
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.screenshot({ path: info.outputPath(`tabs-${width}.png`), fullPage: true, animations: "disabled" });
  }
  await page.getByRole("tab", { name: "Units", exact: true }).click();
  await page.getByRole("tab", { name: "Units", exact: true }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Units", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Categories", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await page.getByRole("searchbox").fill("category-history");
  await expect(page).toHaveURL(/search=category-history/);
  await page.getByRole("tab", { name: "Units", exact: true }).click();
  await page.getByRole("searchbox").fill("unit-history");
  await expect(page).toHaveURL(/search=unit-history/);
  const unitUrl = page.url();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("link", { name: "Items", exact: true }).click();
  await expect(page).toHaveURL(/\/items$/, { timeout: 30_000 });
  await page.goBack();
  await expect(page).toHaveURL(unitUrl);
  await expect(page.getByRole("searchbox")).toHaveValue("unit-history");
  await page.getByRole("tab", { name: "Categories", exact: true }).click();
  // A route remount restores the active tab from history. Tab-only switches
  // within the mounted workspace retain independent search and page state.
  await page.getByRole("searchbox").fill("category-retained");
  await page.getByRole("tab", { name: "Units", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("unit-history");
  await page.getByRole("tab", { name: "Categories", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("category-retained");
});

for (const [kind, plural] of [["Unit", "Units"], ["Category", "Categories"]]) {
  test(`${plural} keep long facts, dialog recovery and one responsive action`, async ({ page, context }, info) => {
    test.setTimeout(120_000);
    await context.addCookies([{ name: "sidebar_state", value: "true", url: process.env.BETTER_AUTH_URL! }]);
    await open(page);
    await page.setViewportSize({ width: 320, height: 480 });
    await page.getByRole("tab", { name: plural, exact: true }).click();
    await page.getByRole("button", { name: `Create ${kind}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Create ${kind}`, exact: true });
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
    await dialog.getByRole("button", { name: `Create ${kind}`, exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveAttribute("aria-invalid", "true");
    const name = `${kind} ${"長い名前".repeat(22)}`;
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
    const other = kind === "Unit" ? "Abbreviation" : "Description (optional)";
    const value = kind === "Unit" ? "LONGSTATIC" : "Full description ".repeat(30).slice(0, 500);
    await dialog.getByRole("textbox", { name: other, exact: true }).fill(value);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog", { name: "Discard changes?" })).toBeVisible();
    await page.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(name);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/master-data**", async route => {
      if (route.request().method() !== "POST") return route.continue();
      await pending;
      await route.abort("failed");
    });
    await dialog.getByRole("button", { name: `Create ${kind}`, exact: true }).click();
    await expect(dialog.getByRole("button", { name: /Saving/ })).toBeDisabled();
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    release();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByRole("alert")).toBeFocused();
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(name);
    await page.screenshot({ path: info.outputPath(`${plural}-failed-short.png`), fullPage: false, animations: "disabled" });
    await page.unroute("**/master-data**");
    await dialog.getByRole("button", { name: `Create ${kind}`, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.mouse.move(0, 0);
    await page.bringToFront();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 15_000 });
    const row = page.getByRole("row").filter({ has: page.getByText(name, { exact: true }) });
    await expect(row).toHaveCount(1);
    await expect(row.getByText(value.trim(), { exact: true })).toBeVisible();
    const action = row.getByRole("button", { name: `Actions for ${name}`, exact: true });
    await expect(action).toHaveCount(1);
    for (const width of [320, 1024, 1440]) {
      await page.setViewportSize({ width, height: 600 });
      await expect(action).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await page.screenshot({ path: info.outputPath(`${plural}-${width}-long.png`), fullPage: true, animations: "disabled" });
    }
    await action.click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    await page.setViewportSize({ width: 320, height: 480 });
    await expect(page.getByRole("dialog").getByRole("textbox", { name: "Name", exact: true })).toHaveValue(name);
    await page.keyboard.press("Escape");
    await expect(action).toBeFocused();
    await action.click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation).toBeFocused();
    expect(await confirmation.evaluate(element => element.scrollTop)).toBe(0);
    const bounds = (await confirmation.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(15);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(465);
    await page.screenshot({ path: info.outputPath(`${plural}-delete-short.png`), fullPage: false, animations: "disabled" });
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(action).toBeFocused();
  });
}
