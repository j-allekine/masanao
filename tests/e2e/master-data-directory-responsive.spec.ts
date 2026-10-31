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

for (const [kind, plural] of [["Office", "Offices"], ["Vendor", "Vendors"]]) {
  test(`${plural} keep long facts, dialog recovery and one responsive action`, async ({ page, context }, info) => {
    test.setTimeout(120_000);
    await context.addCookies([{ name: "sidebar_state", value: "true", url: process.env.BETTER_AUTH_URL! }]);
    await open(page);
    await page.setViewportSize({ width: 320, height: 480 });
    await page.getByRole("tab", { name: plural, exact: true }).click();
    await page.getByRole("button", { name: `Create ${kind}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Create ${kind}`, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: `Create ${kind}`, exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveAttribute("aria-invalid", "true");
    const name = `${kind} ${"長い名前".repeat(22)}`;
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
    const facts: [string, string][] = kind === "Office" ? [
      ["Abbreviation", "LONGSTATIC"],
      ["Head name", "LongHead".repeat(24)],
      ["Head designation", "Designation ".repeat(12).trim()],
      ["Official email", `${"department".repeat(6)}@${"longdomain".repeat(6)}.gov.ph`],
      ["Contact number", "09123456789".repeat(8)],
    ] : [
      ["Contact person", "LongContact".repeat(13)],
      ["Contact number", "09123456789".repeat(4)],
      ["Email", `${"contact".repeat(8)}@${"longdomain".repeat(6)}.example`],
      ["Address", "Full address ".repeat(38).trim()],
    ];
    for (const [label, value] of facts) await dialog.getByRole("textbox", { name: label, exact: true }).fill(value);
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
    for (const [, value] of facts) await expect(row.getByText(value, { exact: true })).toBeVisible();
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
    for (const button of await confirmation.getByRole("button").all()) await expect.poll(async () => (await button.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    expect(await confirmation.evaluate(element => element.scrollTop)).toBe(0);
    const bounds = (await confirmation.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(15);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(465);
    await page.screenshot({ path: info.outputPath(`${plural}-delete-short.png`), fullPage: false, animations: "disabled" });
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(action).toBeFocused();
  });
}

test("Master Data entry dialogs stay reachable with enlarged text on a short phone", async ({ page }, info) => {
  await open(page);
  await page.setViewportSize({ width: 320, height: 480 });
  await page.addStyleTag({ content: "html { font-size: 200% }" });
  for (const [kind, plural] of [["Unit", "Units"], ["Category", "Categories"], ["Office", "Offices"], ["Vendor", "Vendors"]]) {
    await page.getByRole("tab", { name: plural, exact: true }).click();
    await page.getByRole("button", { name: `Create ${kind}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Create ${kind}`, exact: true });
    await expect(dialog).toBeVisible();
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(15);
    expect(bounds.width + bounds.x).toBeLessThanOrEqual(305);
    expect(bounds.height + bounds.y).toBeLessThanOrEqual(465);
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill("Unsaved directory record");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    const discard = page.getByRole("alertdialog", { name: "Discard changes?" });
    await expect(discard).toBeVisible();
    await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Unsaved directory record");
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    for (const button of await dialog.locator('[data-slot="dialog-footer"]').getByRole("button").all()) {
      expect(await button.evaluate(element => element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight)).toBe(true);
    }
    await page.screenshot({ path: info.outputPath(`${kind}-text200-short.png`), animations: "disabled" });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
});
