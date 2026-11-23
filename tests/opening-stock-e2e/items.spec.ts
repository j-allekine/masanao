import Database from "better-sqlite3";
import { expect, test } from "./fixture";
import { postFixtureSignIn } from "../e2e/fixture-auth";

test.beforeEach(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  database.exec(`
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt)
    VALUES ('inline-existing','Inline Existing','inline existing','default-category-staples-dry-goods','default-unit-kilogram','10',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt)
    VALUES ('inline-sack','Inline Sack','inline sack','inline-sack','inline-sack',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  database.close();
});

for (const width of [1440, 320]) {
  test(`creates an Item with package sizes and manages existing units without losing the count at ${width}px`, async ({ page }, info) => {
    test.setTimeout(180_000);
    const response = await postFixtureSignIn(page.request, { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } });
    expect(response.status()).toBe(200);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/inventory/opening-stock");
    await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
    await page.getByRole("button", { name: "Start opening stock", exact: true }).click();
    await page.getByRole("button", { name: "Add items", exact: true }).click();
    await page.getByLabel("Search Items", { exact: true }).fill("Inline Existing");
    await page.getByRole("button", { name: /Inline Existing.*Add/ }).click();
    await page.getByRole("textbox", { name: "Quantity for Inline Existing", exact: true }).fill("2");
    await page.getByRole("textbox", { name: "Opening unit cost for Inline Existing", exact: true }).fill("5");

    await page.getByRole("button", { name: "Add items", exact: true }).click();
    await page.getByLabel("Search Items", { exact: true }).fill("Cancelled Item");
    await page.getByRole("button", { name: "Create Item: Cancelled Item", exact: true }).click();
    await page.getByRole("dialog", { name: "Create Item", exact: true }).getByLabel("Name", { exact: false }).fill("Cancelled Item changed");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Discard Item changes", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Add items", exact: true })).toBeVisible();
    await page.getByLabel("Search Items", { exact: true }).fill(`Inline Rice ${width}`);
    await page.getByRole("button", { name: `Create Item: Inline Rice ${width}`, exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Create Item", exact: true });
    await editor.getByRole("combobox", { name: "Category", exact: true }).click();
    await page.getByRole("option", { name: "Staples & Dry Goods", exact: true }).click();
    await editor.getByRole("combobox", { name: "Base Unit", exact: true }).click();
    await page.getByRole("option", { name: "Kilogram (kg)", exact: true }).click();
    await editor.getByLabel("Reorder level", { exact: false }).fill("10");
    await editor.getByRole("button", { name: "Add alternate Unit", exact: true }).click();
    await editor.getByRole("combobox", { name: "Alternate Unit 1", exact: true }).click();
    await page.getByRole("option", { name: "Inline Sack (inline-sack)", exact: true }).click();
    await editor.getByRole("textbox", { name: "Base Unit quantity 1", exact: true }).fill("oops");
    await editor.getByRole("button", { name: "Create Item", exact: true }).click();
    await expect(editor.getByRole("textbox", { name: "Base Unit quantity 1", exact: true })).toBeFocused();
    await editor.getByRole("textbox", { name: "Base Unit quantity 1", exact: true }).fill("25");
    await editor.getByRole("button", { name: "Add alternate Unit", exact: true }).click();
    await editor.getByRole("combobox", { name: "Alternate Unit 2", exact: true }).click();
    await page.getByRole("option", { name: "Inline Sack (inline-sack)", exact: true }).click();
    await editor.getByRole("textbox", { name: "Base Unit quantity 2", exact: true }).fill("50");
    await editor.getByRole("button", { name: "Create Item", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`inline-create-${width}.png`) });
    await editor.getByRole("button", { name: "Create Item", exact: true }).click();
    await expect(editor).toBeHidden();
    await expect(page.getByRole("textbox", { name: `Quantity for Inline Rice ${width}`, exact: true })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: `Opening unit cost for Inline Rice ${width}`, exact: true })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Quantity for Inline Existing", exact: true })).toHaveValue("2");
    await expect(page.getByRole("textbox", { name: "Opening unit cost for Inline Existing", exact: true })).toHaveValue("5");
    await page.getByRole("textbox", { name: `Quantity for Inline Rice ${width}`, exact: true }).fill("3");
    await page.getByRole("textbox", { name: `Opening unit cost for Inline Rice ${width}`, exact: true }).fill("1250");
    await page.getByRole("combobox", { name: `Unit for Inline Rice ${width}`, exact: true }).click();
    await page.getByRole("option", { name: "Inline Sack (25 kg)", exact: true }).click();

    await page.getByRole("button", { name: "Manage units for Inline Existing", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Units for Inline Existing", exact: true });
    await sheet.getByRole("button", { name: "Add alternate Unit", exact: true }).click();
    const unitEditor = page.getByRole("dialog", { name: "Add alternate Unit", exact: true });
    await unitEditor.getByRole("combobox", { name: "Alternate Unit", exact: true }).click();
    await page.getByRole("option", { name: "Inline Sack (inline-sack)", exact: true }).click();
    await unitEditor.getByLabel("Base Unit quantity", { exact: false }).fill(width === 1440 ? "10" : "20");
    await unitEditor.getByRole("button", { name: "Save alternate Unit", exact: true }).click();
    await expect(unitEditor).toBeHidden();
    await sheet.getByRole("button", { name: "Close Units panel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Manage units for Inline Existing", exact: true })).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Quantity for Inline Existing", exact: true })).toHaveValue("2");
    await expect(page.getByRole("combobox", { name: "Unit for Inline Existing", exact: true })).toContainText("kg");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("draft saved");
    await page.reload();
    await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
    await expect(page.getByRole("textbox", { name: `Quantity for Inline Rice ${width}`, exact: true })).toHaveValue("3");
    await expect(page.getByRole("combobox", { name: `Unit for Inline Rice ${width}`, exact: true })).toContainText("25 kg");
    await expect(page.getByRole("textbox", { name: "Quantity for Inline Existing", exact: true })).toHaveValue("2");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: info.outputPath(`inline-count-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Discard setup draft", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Discard setup draft", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start opening stock", exact: true })).toBeVisible();
    const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    expect(database.prepare("SELECT id FROM item WHERE name = ?").get(`Inline Rice ${width}`)).toBeTruthy();
    expect(database.prepare("SELECT COUNT(*) AS count FROM inventory_ledger_movement").get()).toMatchObject({ count: 0 });
    expect(database.prepare("SELECT id FROM item WHERE name = 'Cancelled Item changed'").get()).toBeUndefined();
    database.close();
  });
}
