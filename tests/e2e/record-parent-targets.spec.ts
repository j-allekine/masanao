import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
const id = "record-parent-target-285";
const recipeName = "Community recipe preparation ".repeat(8).slice(0, 100).trim();
test.beforeAll(() => { const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!); db.prepare("INSERT INTO recipe(id,name,normalizedName,isActive,baselinePax,createdAt,updatedAt) VALUES (?,?,?,1,50,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, recipeName, recipeName.toLowerCase()); db.close(); });
test.afterAll(() => { const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!); db.prepare("DELETE FROM recipe WHERE id=?").run(id); db.close(); });

test("shared parent navigation stays reachable through long Recipe record new edit and enlarged dialog", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.setViewportSize({ width: 320, height: 480 });
  for (const path of [`/recipes/${id}`, `/recipes/${id}/edit`, "/recipes/new"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    const parent = page.getByRole("navigation", { name: "breadcrumb", exact: true }).getByRole("link").first();
    expect((await parent.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await parent.focus(); await expect(parent).toBeFocused();
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    await parent.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${path.endsWith("edit") ? "edit" : path.endsWith("new") ? "new" : "record"}-parent-200.png`), fullPage: true });
  }
  await page.goto(`/recipes/${id}`);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  const actions = page.getByRole("button", { name: "Recipe actions", exact: true });
  await actions.click(); await page.getByRole("menuitem", { name: "Delete Recipe", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
  await cancel.scrollIntoViewIfNeeded(); await cancel.click(); await expect(actions).toBeFocused();
});
