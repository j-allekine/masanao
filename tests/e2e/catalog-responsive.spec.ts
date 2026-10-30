import Database from "better-sqlite3";
import { expect, test, type Page } from "@playwright/test";

const designId = "e2e-catalog-responsive-design";
const title = `Kitchen ${"長い名前Unicode".repeat(19)}`.slice(0, 200);
const designNo = "UNBROKEN".repeat(12).slice(0, 100);

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try { db.prepare("INSERT INTO activity_design(id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES (?,?,2026,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(designId, designNo, title); }
  finally { db.close(); }
});
test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try { db.prepare("DELETE FROM activity_design WHERE id=?").run(designId); }
  finally { db.close(); }
});

async function signIn(page: Page, admin = true) {
  expect((await page.request.post("/api/auth/sign-in/username", { data: admin ? { username: "municipal.admin", password: "administrator-password" } : { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
}

async function capture(page: Page, path: string) {
  await expect(page.locator('[data-client-ready="true"], [data-items-ready="true"]')).toBeVisible();
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

async function setPaneWidth(page: Page, width: number) {
  await page.setViewportSize({ width: width + 265, height: 900 });
  const pane = page.locator(".workspace-pane");
  const actual = (await pane.boundingBox())!.width;
  await page.setViewportSize({ width: Math.round(width + 265 + width - actual), height: 900 });
  await expect.poll(async () => Math.round((await pane.boundingBox())!.width)).toBe(width);
}

test("catalog pane, content, title and row boundaries settle independently", async ({ page, context }, info) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "sidebar_state", value: "true", url: process.env.BETTER_AUTH_URL! }]);
  await signIn(page);
  for (const [route, name] of [["/activity-designs", "Activity Designs"], ["/items", "Items"]]) {
    await page.goto(route);
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    for (const width of [639, 640, 641, 680, 687, 688, 689]) {
      await setPaneWidth(page, width);
      const geometry = await page.locator(".workspace-content").evaluate(async element => {
        const samples = [];
        for (let i = 0; i < 8; i++) {
          await new Promise(requestAnimationFrame);
          const styles = getComputedStyle(element);
          const row = element.querySelector("tbody tr")!;
          samples.push({ gutter: parseFloat(styles.paddingLeft), inner: element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight), title: getComputedStyle(element.querySelector("h1")!).fontSize, row: getComputedStyle(row).display });
        }
        return samples;
      });
      const expectedGutter = width < 640 ? 16 : 24;
      const inner = width - 2 * expectedGutter;
      for (const sample of geometry) expect(sample).toEqual({ gutter: expectedGutter, inner, title: inner < 640 ? "24px" : "32px", row: inner < 640 ? "grid" : "table-row" });
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 680 || width === 688) await capture(page, info.outputPath(`${name}-${width}-pane.png`));
    }
  }
});

test("compact catalog rows keep every fact, one action and stable overlay focus", async ({ page }, info) => {
  await signIn(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 });
    await page.goto("/activity-designs");
    await page.getByRole("searchbox", { name: "Search Activity Designs", exact: true }).fill(title);
    const row = page.getByRole("row").filter({ hasText: title });
    await expect(row).toHaveCSS("display", "grid");
    for (const value of [title, designNo, "2026"]) await expect(row.getByText(value, { exact: true })).toBeVisible();
    const action = row.getByRole("button", { name: `Actions for ${title}`, exact: true });
    await expect(action).toHaveCount(1);
    const box = (await action.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(40); expect(box.height).toBeGreaterThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await action.click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit Activity Design", exact: true });
    const input = dialog.getByRole("textbox", { name: "Title", exact: true });
    await expect(input).toHaveValue(title);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(input).toHaveValue(title);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(action).toBeFocused();
    await page.setViewportSize({ width, height: 640 });
    await capture(page, info.outputPath(`design-${width}-long.png`));
    await page.getByRole("searchbox", { name: "Search Activity Designs", exact: true }).fill("__no_design__");
    await expect(page.getByText("No Activity Designs match your current filters.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(page.getByRole("searchbox", { name: "Search Activity Designs", exact: true })).toHaveValue("");
  }
  await page.goto("/items");
  const item = page.getByRole("row").filter({ hasText: "Rice" });
  await expect(item).toHaveCSS("display", "grid");
  for (const fact of ["Rice", "Staples & Dry Goods", "Kilogram", "10 kg", "Active"]) await expect(item.getByText(fact, { exact: true })).toBeVisible();
  await expect(item.getByRole("button", { name: "Actions for Rice", exact: true })).toHaveCount(1);
  await capture(page, info.outputPath("items-390.png"));
});

test("read-only Items and enlarged text retain facts without page overflow", async ({ page }, info) => {
  await signIn(page, false);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/items");
  await expect(page.getByRole("button", { name: "Create Item", exact: true })).toHaveCount(0);
  await page.addStyleTag({ content: "html { font-size: 200%; } p, td, th, h1, button { letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important; }" });
  const action = page.getByRole("button", { name: "Actions for Rice", exact: true });
  await action.click();
  await expect(page.getByRole("menuitem", { name: "Units", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, info.outputPath("items-staff-200-text-spacing.png"));
});

test("catalog text and keyboard focus retain contrast and reduced motion", async ({ page }, info) => {
  await signIn(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/activity-designs");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  const link = page.getByRole("link", { name: title, exact: true });
  await link.focus();
  await expect(link).toBeFocused();
  const contrasts = await link.evaluate(element => {
    const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
    const luminance = (color: string) => rgb(color).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const styles = getComputedStyle(element);
    const surface = getComputedStyle(element.closest("[data-workspace-catalog]")!).backgroundColor;
    const metadata = getComputedStyle(element.closest("tr")!.querySelector('[data-label="Design No."]')!);
    return { recordLink: ratio(styles.color, surface), metadata: ratio(metadata.color, surface), focus: ratio(styles.outlineColor, surface), outlineWidth: styles.outlineWidth, transition: getComputedStyle(element.closest("tr")!).transitionDuration };
  });
  expect(contrasts.recordLink).toBeGreaterThanOrEqual(4.5);
  expect(contrasts.metadata).toBeGreaterThanOrEqual(4.5);
  expect(contrasts.focus).toBeGreaterThanOrEqual(3);
  expect(parseFloat(contrasts.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(contrasts.transition).toBe("0s");
  await info.attach("contrast.json", { body: JSON.stringify(contrasts), contentType: "application/json" });
  await capture(page, info.outputPath("design-keyboard-contrast.png"));
});
