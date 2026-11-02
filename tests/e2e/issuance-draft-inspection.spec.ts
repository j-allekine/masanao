import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { RECIPE_NAME_MAX_LENGTH } from "../../src/features/recipes/domain/recipe";

function database() {
  const path = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!path) throw new Error("Missing isolated E2E database");
  return new Database(path);
}
const recipeName = `Native zoom ${"W".repeat(88)}`;
for (const username of ["municipal.admin", "kitchen.staff"]) test(`${username} inspects a maximum Recipe title and twelve exact contributions in a bounded draft Sheet`, async ({ page }, info) => {
  test.setTimeout(120_000);
  expect(recipeName.length).toBe(RECIPE_NAME_MAX_LENGTH);
  const prefix = `draft-inspection-288-${randomUUID().slice(0, 8)}`;
  const ids = { design: `${prefix}-design`, activity: `${prefix}-activity`, meal: `${prefix}-meal`, recipe: `${prefix}-recipe` };
  const items = Array.from({ length: 12 }, (_, n) => `${prefix}-item-${String(n + 1).padStart(2, "0")}`);
  const itemNames = items.map((_, n) => `Inspection ingredient ${String(n + 1).padStart(2, "0")}`);
  const db = database();
  try { db.transaction(() => {
    const reference = db.prepare("SELECT categoryId,baseUnitId FROM item WHERE id='e2e-recipe-item-rice'").get() as { categoryId: string; baseUnitId: string };
    db.prepare("INSERT INTO activity_design(id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES(?,?, 'Inspection',2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(ids.design, prefix);
    db.prepare("INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES(?,?,'Inspection Activity','Kitchen','2026-11-01',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(ids.activity, ids.design);
    db.prepare("INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES(?,?,'Inspection Meal','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(ids.meal, ids.activity);
    db.prepare("INSERT INTO recipe(id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES(?,?,?,50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(ids.recipe, recipeName, recipeName.toLowerCase());
    items.forEach((id, n) => {
      db.prepare("INSERT INTO item(id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES(?,?,?,?,?,'0',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, itemNames[n], `${prefix}-${n}`, reference.categoryId, reference.baseUnitId);
      db.prepare("INSERT INTO recipe_ingredient(id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES(?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`${id}-ingredient`, ids.recipe, id, String(n + 1));
    });
  })(); } finally { db.close(); }
  try {
    expect((await page.request.post("/api/auth/sign-in/username", { data: { username, password: username === "municipal.admin" ? "administrator-password" : "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
    await page.goto(`/activity-designs/${ids.design}/activities/${ids.activity}/meal-schedules/${ids.meal}`);
    await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Meal pax", { exact: true }).fill("100");
    await page.getByRole("button", { name: "Add Recipes", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Add Recipes", exact: true });
    await picker.getByLabel("Search Recipes").fill(recipeName);
    await picker.getByRole("checkbox", { name: recipeName, exact: true }).check();
    await picker.getByRole("button", { name: "Add 1 Recipe", exact: true }).click();
    await expect(picker.getByRole("heading", { name: "Already added (1)", exact: true })).toBeVisible();
    await picker.getByRole("button", { name: "Done", exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add Recipes", exact: true })).toBeFocused();
    const opener = page.getByRole("button", { name: `View ingredients for ${recipeName}`, exact: true });
    for (const [width, height, enlarged] of [[1280, 720, false], [320, 180, false], [320, 480, true]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(value => { document.documentElement.style.fontSize = value ? "200%" : ""; }, enlarged);
      await opener.focus(); await expect(opener).toBeFocused(); await opener.press("Enter");
      const sheet = page.getByRole("dialog", { name: recipeName, exact: true });
      await expect(sheet).toBeVisible();
      const geometry = await sheet.evaluate(element => {
        const close = element.querySelector('[data-slot="sheet-close"]')!;
        const rect = close.getBoundingClientRect();
        return { client: element.clientWidth, scroll: element.scrollWidth, closeWidth: rect.width, closeHeight: rect.height };
      });
      await info.attach(`inspection-${width}-${height}-${enlarged}`, { body: JSON.stringify(geometry), contentType: "application/json" });
      await page.screenshot({ path: info.outputPath(`inspection-${width}-${height}-${enlarged}-top.png`), animations: "disabled" });
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1);
      expect(geometry.closeWidth).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
      expect(geometry.closeHeight).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
      await expect(sheet.getByRole("heading", { name: recipeName, exact: true })).toBeFocused();
      const table = sheet.getByRole("table", { name: "Recipe ingredients: baseline and scaled quantities", exact: true });
      await expect(table.locator("tbody tr")).toHaveCount(12);
      for (const index of [0, 11]) {
        const row = table.locator("tbody tr").filter({ hasText: itemNames[index] });
        const cells = row.getByRole("cell");
        await expect(cells.nth(1)).toHaveText(`${index + 1} kg`);
        await expect(cells.nth(2)).toHaveText(`${(index + 1) * 2} kg`);
      }
      const last = table.locator("tbody tr").filter({ hasText: itemNames[11] });
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
      expect(await sheet.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`inspection-${width}-${height}-${enlarged}-end.png`), animations: "disabled" });
      await expect(sheet.getByRole("textbox")).toHaveCount(0);
      const close = sheet.getByRole("button", { name: "Close", exact: true });
      await expect(close).toBeInViewport();
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(opener).toBeFocused();
      // A long opener can exceed the short editor body. Use its observed visible
      // portion for real pointer proof, rather than its occluded geometric center.
      await opener.scrollIntoViewIfNeeded();
      const pointer = await opener.evaluate(element => {
        const button = element.getBoundingClientRect();
        const body = element.closest('[data-workspace-scroll="body"]')!.getBoundingClientRect();
        const left = Math.max(button.left, body.left, 0), right = Math.min(button.right, body.right, innerWidth);
        const top = Math.max(button.top, body.top, 0), bottom = Math.min(button.bottom, body.bottom, innerHeight);
        return { x: (left + right) / 2 - button.left, y: (top + bottom) / 2 - button.top, width: right - left, height: bottom - top };
      });
      expect(pointer.width).toBeGreaterThan(0); expect(pointer.height).toBeGreaterThan(0);
      await info.attach(`pointer-${width}-${height}-${enlarged}`, { body: JSON.stringify(pointer), contentType: "application/json" });
      await opener.click({ position: { x: pointer.x, y: pointer.y } }); await expect(sheet).toBeVisible();
      await sheet.getByRole("button", { name: "Close", exact: true }).click();
      await expect(sheet).toHaveCount(0); await expect(opener).toBeFocused();
    }
    await page.setViewportSize({ width: 320, height: 480 });
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.getByRole("button", { name: "Review quantities and stock", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Combined quantities and stock", exact: true });
    await review.getByRole("button", { name: `Adjust issued quantity for ${itemNames[0]}`, exact: true }).click();
    await review.getByLabel(`Final quantity for ${itemNames[0]}`, { exact: true }).fill("3");
    await review.getByRole("button", { name: "Confirm quantity", exact: true }).click();
    await review.getByRole("button", { name: "Close review", exact: true }).click();
    await expect(review).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Review quantities and stock", exact: true })).toBeFocused();
    await opener.click();
    const sheet = page.getByRole("dialog", { name: recipeName, exact: true });
    await expect(sheet.getByRole("row").filter({ hasText: itemNames[0] }).getByRole("cell").nth(2)).toHaveText("2 kg");
    await expect(sheet.getByRole("row").filter({ hasText: itemNames[0] }).getByRole("cell").first()).toContainText("Combined total adjusted. Contribution remains calculated.");
    await sheet.getByRole("button", { name: "View combined review", exact: true }).click();
    await expect(sheet).toHaveCount(0); await expect(review).toBeVisible();
    await expect(review.getByRole("listitem").filter({ hasText: itemNames[0] })).toContainText("3 kg");
    await page.keyboard.press("Escape");
    await expect(review).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Review quantities and stock", exact: true })).toBeFocused();
    const check = database();
    try { expect(check.prepare("SELECT COUNT(*) count FROM issuance_record WHERE mealScheduleId=?").get(ids.meal)).toEqual({ count: 0 }); } finally { check.close(); }
  } finally {
    const cleanup = database();
    try { cleanup.transaction(() => {
      items.forEach(id => cleanup.prepare("DELETE FROM recipe_ingredient WHERE id=?").run(`${id}-ingredient`));
      cleanup.prepare("DELETE FROM recipe WHERE id=?").run(ids.recipe);
      items.forEach(id => cleanup.prepare("DELETE FROM item WHERE id=?").run(id));
      cleanup.prepare("DELETE FROM meal_schedule WHERE id=?").run(ids.meal);
      cleanup.prepare("DELETE FROM activity WHERE id=?").run(ids.activity);
      cleanup.prepare("DELETE FROM activity_design WHERE id=?").run(ids.design);
    })(); } finally { cleanup.close(); }
  }
});
