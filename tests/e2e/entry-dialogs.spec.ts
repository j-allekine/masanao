import Database from "better-sqlite3";
import { expect, test, type Locator } from "@playwright/test";

const designId = "e2e-entry-dialogs";
const longTitle = "Community kitchen preparation and distribution ".repeat(5).slice(0, 200);

test.beforeAll(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.prepare("INSERT INTO activity_design (id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES (?,?,?,2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
      .run(designId, "ENTRY-DIALOGS", longTitle);
    database.prepare("INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES (?,?,'Dialog Activity','Kitchen','2026-10-30',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
      .run(`${designId}-activity`, designId);
  } finally { database.close(); }
});

test.afterAll(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.prepare("DELETE FROM activity WHERE activityDesignId = ?").run(designId);
    database.prepare("DELETE FROM activity_design WHERE id = ?").run(designId);
  }
  finally { database.close(); }
});

test.beforeEach(async ({ page }) => {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  });
  expect(response.status()).toBe(200);
});

async function expectBoundedDialog(dialog: Locator) {
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.top >= 15 && box.bottom <= innerHeight - 15 && box.left >= 15 && box.right <= innerWidth - 15;
  })).toBe(true);
  const heading = dialog.getByRole("heading");
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect.poll(async () => (await close.boundingBox())?.width).toBe(40);
  const [titleBox, closeBox, dialogBox] = await Promise.all([
    heading.boundingBox(), close.boundingBox(), dialog.boundingBox(),
  ]);
  expect(closeBox!.width).toBeGreaterThanOrEqual(40);
  expect(closeBox!.height).toBeGreaterThanOrEqual(40);
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width - 40);
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(closeBox!.x);
}

test("short Planning entry keeps the full dynamic title clear of Close and every field reachable", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto(`/activity-designs/${designId}`);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Create Activity", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Add Activity to “${longTitle}”`, exact: true });
  await expectBoundedDialog(dialog);
  await expect(dialog.getByRole("heading")).toHaveText(`Add Activity to “${longTitle}”`);
  const name = dialog.getByRole("textbox", { name: "Activity name", exact: true });
  await expect(dialog).toBeFocused();
  await expect(dialog.getByRole("heading")).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath("activity-long-title-initial.png") });
  await name.fill("Retained unsaved Activity");
  await dialog.getByRole("textbox", { name: "Planned budget (optional)", exact: true }).fill("1200");
  await dialog.getByRole("button", { name: "Create Activity", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Office", exact: true })).toBeFocused();
  await expect(name).toHaveValue("Retained unsaved Activity");
  await dialog.evaluate((element) => { element.scrollTop = 0; });
  await expect(dialog.getByRole("heading")).toBeInViewport();
  await page.screenshot({ path: info.outputPath("activity-long-title-short.png") });
  await page.keyboard.press("Escape");
  const discard = page.getByRole("alertdialog", { name: "Discard changes?", exact: true });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(name).toHaveValue("Retained unsaved Activity");
  await page.keyboard.press("Escape");
  await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("short Design and Item dialogs start at editable fields and retain nested-overlay focus", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/activity-designs");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  const createDesign = page.getByRole("button", { name: "Create Activity Design", exact: true });
  await createDesign.click();
  const design = page.getByRole("dialog", { name: "Create Activity Design", exact: true });
  await expectBoundedDialog(design);
  await expect(design.getByRole("textbox", { name: "Activity Design No.", exact: true })).toBeFocused();
  const fiscalYear = design.getByRole("button", { name: "Fiscal Year", exact: true });
  await fiscalYear.click();
  await page.keyboard.press("Escape");
  await expect(design).toBeVisible();
  await expect(fiscalYear).toBeFocused();
  await design.getByRole("textbox", { name: "AIP Reference Code", exact: true }).fill("AIP retained");
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(design.getByRole("textbox", { name: "AIP Reference Code", exact: true })).toHaveValue("AIP retained");
  await page.keyboard.press("Escape");
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes", exact: true }).click();

  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Create Item", exact: true }).click();
  const item = page.getByRole("dialog", { name: "Create Item", exact: true });
  await expectBoundedDialog(item);
  const name = item.getByRole("textbox", { name: "Name", exact: true });
  await expect(name).toBeFocused();
  await name.fill("Retained Item");
  await item.getByRole("textbox", { name: "Item Note (optional)", exact: true }).fill("Retained note");
  await item.getByRole("button", { name: "Create Item", exact: true }).click();
  await expect(item.getByRole("combobox", { name: "Category", exact: true })).toBeFocused();
  await expect(name).toHaveValue("Retained Item");
  await item.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: info.outputPath("item-validation-short.png") });
  await page.keyboard.press("Escape");
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(item).toHaveCount(0);
});

test("short Meal Schedule entry preserves valid labels and focuses the invalid time", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto(`/activity-designs/${designId}/activities/${designId}-activity`);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Meal Schedule", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Meal Schedule", exact: true });
  await expectBoundedDialog(dialog);
  const label = dialog.getByRole("textbox", { name: "Meal Schedule label", exact: true });
  await expect(label).toBeFocused();
  await label.fill("Retained Meal");
  await dialog.getByRole("button", { name: "Add Meal Schedule", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Meal time", exact: true })).toBeFocused();
  await expect(label).toHaveValue("Retained Meal");
  await page.screenshot({ path: info.outputPath("meal-validation-short.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
