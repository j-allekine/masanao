import Database from "better-sqlite3";
import { expect, test, selectOpeningItems } from "./fixture";
import { postFixtureSignIn } from "../e2e/fixture-auth";

test.beforeEach(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  database.exec(`
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt)
    VALUES ('opening-count-rice','Count Rice','count rice','default-category-staples-dry-goods','default-unit-kilogram','10',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt)
    VALUES ('opening-count-sack','Count Sack','count sack','count-sack','count-sack',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO item_unit_conversion (id,itemId,alternateUnitId,baseUnitQuantity,createdAt,updatedAt)
    VALUES ('opening-count-conversion','opening-count-rice','opening-count-sack','25',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  database.close();
});

test("administrator counts exact quantities, saves, recovers errors, guards navigation and discards on desktop/mobile", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const signedIn = await postFixtureSignIn(page.request, { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } });
  expect(signedIn.status()).toBe(200);
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Opening Stock", exact: true }).click();
  await expect(page).toHaveURL(/\/inventory\/opening-stock$/);
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Start opening stock", exact: true }).click();
  await page.getByRole("button", { name: "Add items", exact: true }).click();
  await page.getByLabel("Search Items", { exact: true }).fill("Count Rice");
  await selectOpeningItems(page, ["Count Rice"]);
  await page.getByRole("textbox", { name: "Quantity for Count Rice", exact: true }).fill("3");
  await page.getByRole("combobox", { name: "Unit for Count Rice", exact: true }).click();
  await page.getByRole("option", { name: "Count Sack (25 kg)", exact: true }).click();
  await page.getByRole("textbox", { name: "Opening unit cost for Count Rice", exact: true }).fill("0");
  await page.getByRole("textbox", { name: "Reason for zero cost", exact: true }).fill("Confirmed zero assigned cost");
  await expect(page.getByRole("cell", { name: "75 kg", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await page.reload();
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Quantity for Count Rice", exact: true })).toHaveValue("3");
  await expect(page.getByRole("textbox", { name: "Opening unit cost for Count Rice", exact: true })).toHaveValue("0");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeEnabled();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("heading", { name: "Start with what’s already in your kitchen", exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("opening-count-desktop.png"), fullPage: true });
  await page.getByRole("textbox", { name: "Quantity for Count Rice", exact: true }).fill("oops");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Quantity for Count Rice", exact: true })).toBeFocused();
  await expect(page.getByText("Review the starting count", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Quantity for Count Rice", exact: true }).fill("4");
  await page.getByRole("button", { name: "Back to Inventory", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Leave unsaved count changes?");
  await page.getByRole("button", { name: "Stay here", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole("textbox", { name: "Quantity for Count Rice", exact: true })).toHaveValue("4");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeEnabled();
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("heading", { name: "Start with what’s already in your kitchen", exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("opening-count-mobile-320.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Discard setup draft", exact: true }).click();
  await page.getByRole("button", { name: "Keep counting", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Quantity for Count Rice", exact: true })).toHaveValue("4");
  await page.getByRole("button", { name: "Discard setup draft", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard setup draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start opening stock", exact: true })).toBeVisible();
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  expect(database.prepare("SELECT COUNT(*) AS count FROM inventory_ledger_movement").get()).toMatchObject({ count: 0 });
  expect(database.prepare("SELECT id FROM item WHERE id = 'opening-count-rice'").get()).toBeTruthy();
  database.close();
});
