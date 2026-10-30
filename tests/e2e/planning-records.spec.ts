import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const designId = "e2e-issuance-record-presentation";
const activityId = `${designId}-activity`;
const designUrl = `/activity-designs/${designId}`;
const activityUrl = `${designUrl}/activities/${activityId}`;
const title = "Community kitchen annual planning ".repeat(5).trim();
const activityName = "Community meal preparation ".repeat(6).trim();

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.prepare("INSERT INTO activity_design (id,activityDesignNo,title,fiscalYear,aipReferenceCode,createdAt,updatedAt) VALUES (?,?,?,2026,'AIP-2026',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(designId, "RECORD-2026", title);
  db.prepare("INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedBudgetCentavos,particulars,createdAt,updatedAt) VALUES (?,?,?,'Kitchen Office','2026-10-30',0,'First line\nSecond line',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(activityId, designId, activityName);
  db.close();
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.prepare("DELETE FROM activity WHERE id=?").run(activityId);
  db.prepare("DELETE FROM activity_design WHERE id=?").run(designId);
  db.close();
});

for (const username of ["kitchen.staff", "municipal.admin"]) {
  test(`${username} can inspect, edit and cancel Planning records with responsive ancestry`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const response = await page.request.post("/api/auth/sign-in/username", {
      data: { username, password: username === "municipal.admin" ? "administrator-password" : "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    });
    expect(response.status()).toBe(200);
    for (const viewport of [{ width: 1280, height: 800 }, { width: 900, height: 600 }, { width: 320, height: 480 }]) {
      await page.setViewportSize(viewport);
      await page.goto(designUrl);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      if (viewport.width === 900) {
        const toggle = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
        if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
      }
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      const editDesign = page.getByRole("button", { name: "Edit Activity Design", exact: true });
      await editDesign.click();
      await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(editDesign).toBeFocused();
      await page.getByRole("button", { name: "More Activity Design actions", exact: true }).click();
      await page.getByRole("menuitem", { name: "Delete Activity Design", exact: true }).click();
      await expect(page.getByRole("alertdialog")).toContainText("cannot be deleted");
      await page.getByRole("alertdialog").getByRole("button", { name: "Close", exact: true }).click();
      await expect(page.getByRole("button", { name: "More Activity Design actions", exact: true })).toBeFocused();
      await page.getByRole("button", { name: "Additional details", exact: true }).click();
      await expect(page.getByText("AIP-2026", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`design-${username}-${viewport.width}.png`), fullPage: true });

      await page.getByRole("link", { name: `Open Activity: ${activityName}`, exact: true }).click();
      await expect(page).toHaveURL(activityUrl);
      await expect(page.getByRole("heading", { level: 1, name: activityName })).toBeVisible();
      await expect(page.getByText("Not recorded", { exact: true })).toBeVisible();
      const breadcrumb = page.getByRole("navigation", { name: "breadcrumb", exact: true });
      await expect(breadcrumb.getByRole("link", { name: "RECORD-2026", exact: true })).toHaveAttribute("href", designUrl);
      const innerWidth = await page.locator(".workspace-content").evaluate(el => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight));
      if (innerWidth < 640) {
        await breadcrumb.getByRole("button", { name: "Show ancestors", exact: true }).click();
        await expect(page.getByRole("menuitem", { name: "Activity Designs", exact: true })).toHaveAttribute("href", "/activity-designs");
        await page.keyboard.press("Escape");
      } else {
        await expect(breadcrumb.getByRole("link", { name: "Activity Designs", exact: true })).toBeVisible();
      }
      const editActivity = page.getByRole("button", { name: "Edit Activity", exact: true });
      await editActivity.click();
      await expect(page.getByRole("textbox", { name: "Activity Design", exact: true })).toHaveValue(`${title} · RECORD-2026`);
      await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(editActivity).toBeFocused();
      const activityActions = page.getByRole("button", { name: "More Activity actions", exact: true });
      await activityActions.click();
      await page.getByRole("menuitem", { name: "Delete Activity", exact: true }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(activityActions).toBeFocused();
      await page.getByRole("button", { name: "Additional details", exact: true }).click();
      await expect(page.getByText("₱0.00", { exact: true })).toBeVisible();
      await expect(page.getByText("First line\nSecond line", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`activity-${username}-${viewport.width}.png`), fullPage: true });
    }
  });
}

test("Planning records retain not-found and nested ownership checks", async ({ page }, info) => {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  for (const path of ["/activity-designs/missing-record", `${designUrl}/activities/missing-record`, `/activity-designs/foreign-parent/activities/${activityId}`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath("record-nested-not-found.png"), fullPage: true });
});

test("current-record edits recover from a failed save and empty records delete through their real parents", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.goto(designUrl);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Edit Activity Design", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("Updated record Design");
  await page.route(`**${designUrl}`, route => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog.getByText("The Activity Design could not be saved. Check your connection and try again.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Title", exact: true })).toHaveValue("Updated record Design");
  await page.screenshot({ path: info.outputPath("record-edit-failed-save.png"), fullPage: true });
  await page.unrouteAll({ behavior: "wait" });
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Updated record Design", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Activity Design", exact: true })).toBeFocused();

  await page.goto(activityUrl);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Edit Activity", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Activity name", exact: true }).fill("Updated record Activity");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Updated record Activity", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Activity", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "More Activity actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete Activity", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete Activity", exact: true }).click();
  await expect(page).toHaveURL(designUrl);
  await expect(page.getByRole("heading", { name: "Activities (0)", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "More Activity Design actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete Activity Design", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete Activity Design", exact: true }).click();
  await expect(page).toHaveURL("/activity-designs");
});

