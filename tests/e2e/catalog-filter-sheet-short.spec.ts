import { expect, test, type Locator } from "@playwright/test";

async function expectContained(control: Locator, body: Locator, minSize: number) {
  await control.focus();
  await expect(control).toBeFocused();
  await expect.poll(async () => {
    const field = (await control.boundingBox())!;
    const region = (await body.boundingBox())!;
    return field.y >= region.y - 1 && field.y + field.height <= region.y + region.height + 1;
  }).toBe(true);
  const box = (await control.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(minSize);
}

for (const [name, route, activeRoute] of [
  ["Items", "/items", "/items?itemsStatus=active&itemsCategory=default-category-staples-dry-goods"],
  ["Inventory", "/inventory", "/inventory?status=reorder-now"],
] as const) test(`${name} filter sheet keeps short and enlarged active controls reachable`, async ({ page, context }, info) => {
  test.setTimeout(150_000);
  await context.addCookies([{ name: "sidebar_state", value: "true", url: process.env.BETTER_AUTH_URL! }]);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  for (const [width, height, enlarged] of [[320, 180, false], [320, 480, true], [320, 480, false], [900, 480, false]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(activeRoute);
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    await page.evaluate(value => { document.documentElement.style.fontSize = value ? "200%" : "100%"; }, enlarged);
    await page.addStyleTag({ content: "nextjs-portal { display:none !important }" });
    const toolbar = page.getByRole("search");
    await expect(toolbar).toHaveAttribute("data-filter-layout", "panel");
    const trigger = toolbar.getByRole("button", { name: /^Filters/ });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Filters", exact: true });
    await expect(sheet).toHaveCSS("opacity", "1");
    const body = sheet.locator("div.overflow-y-auto");
    const geometry = await sheet.evaluate(element => {
      const rect = (node: Element) => { const b = node.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height, width: b.width }; };
      const body = element.querySelector("div.overflow-y-auto")!;
      return { sheet: rect(element), title: rect(element.querySelector('[data-slot="sheet-title"]')!), body: rect(body), close: rect(element.querySelector('button[aria-label="Close"]') ?? [...element.querySelectorAll("button")].find(button => button.textContent === "Close")!), scrollers: [...element.querySelectorAll("*")].filter(node => getComputedStyle(node).overflowY === "auto").length };
    });
    await info.attach(`${width}-${height}-${enlarged}-geometry`, { body: JSON.stringify(geometry), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath(`${width}-${height}-${enlarged}-active.png`), animations: "disabled" });
    expect(geometry.body.height).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
    expect(geometry.close.width).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
    expect(geometry.close.height).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
    expect(geometry.title.top).toBeGreaterThanOrEqual(0);
    expect(geometry.title.bottom).toBeLessThanOrEqual(height);
    expect(geometry.scrollers).toBe(1);
    for (const control of await body.getByRole("combobox").all()) {
      await expectContained(control, body, enlarged ? 80 : 40);
      const box = (await control.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(height);
      await control.press("Enter");
      await expect(page.getByRole("listbox")).toBeVisible();
      await page.keyboard.press("Escape");
      await expectContained(control, body, enlarged ? 80 : 40);
    }
    await page.screenshot({ path: info.outputPath(`${width}-${height}-${enlarged}-focused.png`), animations: "disabled" });
    for (const label of ["Reset filters", "Show results"]) {
      const button = sheet.getByRole("button", { name: label, exact: true });
      const b = (await button.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
      expect(b.y).toBeGreaterThanOrEqual(geometry.body.bottom - 1);
      expect(b.y + b.height).toBeLessThanOrEqual(height);
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
    await sheet.getByRole("button", { name: "Reset filters", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAccessibleName("Filters");
    await expect(page).toHaveURL(new URL(route, page.url()).href);
    await trigger.click();
    await expect(sheet).toHaveCSS("opacity", "1");
    await sheet.getByRole("button", { name: "Close", exact: true }).focus();
    await body.evaluate(element => { element.scrollTop = 0; });
    await expect(body).toContainText("Narrow the list. Changes apply immediately.");
    await page.screenshot({ path: info.outputPath(`${width}-${height}-${enlarged}-reset.png`), animations: "disabled" });
    for (const control of await body.getByRole("combobox").all()) await expectContained(control, body, enlarged ? 80 : 40);
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("eight search-only consumers retain their toolbar without a filter Sheet", async ({ page }) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.setViewportSize({ width: 320, height: 480 });
  for (const route of ["/recipes", "/purchase-orders", "/activity-designs", "/activities", "/master-data", "/master-data?tab=categories", "/master-data?tab=offices", "/master-data?tab=vendors"]) {
    await page.goto(route);
    const toolbar = page.getByRole("search");
    await expect(toolbar).toHaveAttribute("data-filter-layout", "search");
    await expect(toolbar.getByRole("searchbox")).toBeEnabled();
    await expect(toolbar.getByRole("button", { name: /^Filters/ })).toHaveCount(0);
  }
});

test("short Inventory filters retain focus and context during a pending stock refresh", async ({ page }, info) => {
  test.setTimeout(90_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.setViewportSize({ width: 320, height: 180 });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/inventory?**", async route => {
    if (route.request().headers()["rsc"] === "1") await gate;
    await route.continue();
  });
  const requested = page.waitForRequest(request => request.headers()["rsc"] === "1" && new URL(request.url()).pathname === "/inventory");
  try {
    await page.goto("/inventory?status=reorder-now&page=42");
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    await requested;
    await expect(page.getByRole("button", { name: "Refreshing…", exact: true })).toBeVisible();
    const trigger = page.getByRole("search").getByRole("button", { name: /^Filters/ });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Filters", exact: true });
    const status = sheet.getByRole("combobox", { name: "Stock status", exact: true });
    const body = sheet.locator("div.overflow-y-auto");
    await expectContained(status, body, 40);
    await expect(status).toContainText("Reorder now");
    await page.addStyleTag({ content: "nextjs-portal { display:none !important }" });
    await page.screenshot({ path: info.outputPath("pending-short.png"), animations: "disabled" });
    release();
    await expect(page).not.toHaveURL(/page=42/);
    // The modal correctly hides background controls from the accessibility tree.
    await expect(page.locator('[data-inventory-ready] button').filter({ hasText: /^Refresh$/ })).toBeEnabled();
    await expect(status).toBeFocused();
    await expectContained(status, body, 40);
    await expect(status).toContainText("Reorder now");
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(/status=reorder-now/);
  } finally { release(); }
});
