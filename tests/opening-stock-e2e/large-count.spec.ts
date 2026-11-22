import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { postFixtureSignIn } from "../e2e/fixture-auth";

const names = Array.from({ length: 20 }, (_, index) => `Large count ${String(index + 1).padStart(2, "0")} kitchen supply with a long descriptive package and storage label`);

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  const insert = db.prepare("INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?,?,?,'default-category-staples-dry-goods','default-unit-kilogram','1',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
  for (const [index, name] of names.entries()) insert.run(`large-count-${index}`, name, name.toLowerCase());
  db.close();
});

test("a saved twenty-line count keeps long labels, review actions and keyboard focus usable at desktop and 320px", async ({ page }, info) => {
  test.setTimeout(240_000);
  expect((await postFixtureSignIn(page.request, { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/inventory");
  await page.getByRole("link", { name: "Opening Stock", exact: true }).click();
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Start opening stock", exact: true }).click();
  for (const name of names) {
    await page.getByRole("button", { name: "Add items", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Add items", exact: true });
    await picker.getByRole("textbox", { name: "Search Items", exact: true }).fill(name);
    await picker.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    await page.getByRole("textbox", { name: `Quantity for ${name}`, exact: true }).fill("0.123456789123456789");
    await page.getByRole("textbox", { name: `Opening unit cost for ${name}`, exact: true }).fill("12.34");
  }
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await page.reload();
  await expect(page.locator('[data-opening-stock-ready="true"]')).toBeVisible();
  await expect(page.getByRole("textbox", { name: `Quantity for ${names[19]}`, exact: true })).toHaveValue("0.123456789123456789");
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`large-count-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Review opening stock", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Review opening stock", exact: true });
    await expect(review).toContainText(names[19]);
    expect(await review.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(review.getByRole("button", { name: "Post opening stock", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`large-count-review-${width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(review).toBeHidden();
    await expect(page.getByRole("button", { name: "Review opening stock", exact: true })).toBeFocused();
  }
});
