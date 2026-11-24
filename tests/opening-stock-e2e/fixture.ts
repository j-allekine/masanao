import { test as base, expect, type Page } from "@playwright/test";
import { restoreOpeningStockBaseline } from "./database-fixture";

export const test = base.extend<{ openingStockBaseline: void }>({
  openingStockBaseline: [async ({}, use, testInfo) => {
    // The reset must never race another journey, even with a CLI worker override.
    const setup = testInfo.config.globalSetup?.replaceAll("\\", "/");
    if (testInfo.config.workers !== 1 || !setup?.endsWith("opening-stock-e2e/global-setup.ts")) {
      throw new Error("Opening Stock journeys require playwright.opening-stock.config.ts and one worker");
    }
    const databasePath = process.env.MASANAO_E2E_DATABASE_PATH;
    if (!databasePath) throw new Error("Opening Stock browser database is not configured");
    // Automatic test fixtures run before each spec's beforeEach seed hook.
    restoreOpeningStockBaseline(databasePath);
    await use();
  }, { auto: true }],
});

export { expect };

export async function confirmOpeningItems(page: Page) {
  const picker = page.getByRole("dialog", { name: "Add items", exact: true });
  await picker.getByRole("button", { name: /^Add selected \(/ }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole("button", { name: "Add items", exact: true })).toBeFocused();
}

export async function selectOpeningItems(page: Page, names: string[]) {
  const picker = page.getByRole("dialog", { name: "Add items", exact: true });
  for (const name of names) {
    await picker.getByRole("textbox", { name: "Search Items", exact: true }).fill(name);
    await picker.getByRole("checkbox", { name: `Select ${name}`, exact: true }).check();
  }
  await confirmOpeningItems(page);
}
