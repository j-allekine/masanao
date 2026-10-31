import Database from "better-sqlite3";
import { expect, test, type Page } from "@playwright/test";

const id = "child-activities-284";
const record = `/activity-designs/${id}`;
function database() { return new Database(process.env.MASANAO_E2E_DATABASE_PATH!); }
function setCount(count: number) {
  const db = database();
  db.prepare("DELETE FROM activity WHERE activityDesignId=?").run(id);
  const insert = db.prepare("INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES(?,?,?,?,'2026-10-31','2026-10-31','2026-10-31')");
  for (let n = 1; n <= count; n++) insert.run(`${id}-${String(n).padStart(3, "0")}`, id, n === 25 ? `Child Activity 25 ${"Long community preparation ".repeat(6)}`.slice(0, 190) : `Child Activity ${n}`, n === 1 ? "Later Office" : "Kitchen");
  db.close();
}
async function signIn(page: Page, username: string) {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username, password: username === "municipal.admin" ? "administrator-password" : "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
}
test.beforeAll(() => {
  const db = database();
  db.prepare("INSERT INTO activity_design(id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES(?, 'CHILD-284','Child Activity finding',2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id);
  db.close();
});
test.afterAll(() => { setCount(0); const db = database(); db.prepare("DELETE FROM activity_design WHERE id=?").run(id); db.close(); });

for (const username of ["municipal.admin", "kitchen.staff"]) test(`${username} finds all Design children and retains safe independent return state`, async ({ page, context }, info) => {
  test.setTimeout(150_000);
  await signIn(page, username);
  const section = page.getByRole("region", { name: /^Activities \(/ });
  for (const count of [0, 1, 10, 11, 25]) {
    setCount(count);
    await page.goto(record);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await expect(section.getByRole("heading", { name: `Activities (${count})`, exact: true })).toBeVisible();
    await expect(section.getByRole("searchbox")).toHaveCount(count > 10 ? 1 : 0);
    await expect(section.getByRole("link", { name: /^Open Activity:/ })).toHaveCount(Math.min(10, count));
    if (!count) await expect(section).toContainText("No Activities yet.");
  }
  for (const width of [1280, 900, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 480 : 700 });
    await page.goto(`${record}?${new URLSearchParams({ planningReturn: "/activities?activitiesSearch=Kitchen&activitiesPage=3" })}`);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    if (width === 900) {
      const toggle = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
      if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
    }
    const search = section.getByRole("searchbox");
    await expect(section.getByRole("link", { name: /^Open Activity:/ }).first()).toContainText("Child Activity 25");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${username}-${width}-long-identity.png`), fullPage: true, animations: "disabled" });
    await search.fill("Later Office");
    await expect(section.getByRole("link", { name: "Open Activity: Child Activity 1", exact: true })).toBeVisible();
    await expect(section).toContainText("Showing 1 result");
    await search.fill("absent match");
    await expect(section).toContainText("No matching Activities");
    await section.getByRole("button", { name: "Clear Activity search", exact: true }).click();
    await expect(search).toBeFocused();
    await section.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(section).toContainText("Showing 11 to 20 of 25 results");
    await page.reload();
    await expect(section).toContainText("Showing 11 to 20 of 25 results");
    const link = section.getByRole("link", { name: /^Open Activity:/ }).first();
    const href = (await link.getAttribute("href"))!;
    expect(href).toContain("designActivitiesPage=2");
    expect(href).toContain("planningReturn=");
    const other = await context.newPage();
    await other.goto(href);
    await expect(other.getByRole("heading", { level: 1 })).toContainText("Child Activity");
    const parentLink = other.getByRole("link", { name: "CHILD-284", exact: true });
    if (!await parentLink.isVisible()) await other.getByRole("button", { name: "Show ancestors", exact: true }).click();
    await parentLink.click();
    await expect(other.getByRole("region", { name: /^Activities \(/ })).toContainText("Showing 11 to 20 of 25 results");
    await other.close();
    await link.click();
    await expect(page).toHaveURL(new URL(href, page.url()).href, { timeout: 30_000 });
    await page.goBack();
    await expect(section).toContainText("Showing 11 to 20 of 25 results");
    await page.goForward();
    await expect(page).toHaveURL(new URL(href, page.url()).href, { timeout: 30_000 });
    await page.goBack();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${username}-${width}-later-page.png`), fullPage: true, animations: "disabled" });
  }
  setCount(11);
  await page.goto(`${record}?designActivitiesOwner=${id}&designActivitiesPage=99&designActivitiesSearch=Kitchen`);
  await expect(section).toContainText("Showing 1 to 10 of 10 results");
  await expect(page).not.toHaveURL(/designActivitiesPage=/);
  setCount(1);
  await page.reload();
  await expect(section).toContainText("No matching Activities");
  await expect(section.getByRole("button", { name: "Clear Activity search", exact: true })).toBeVisible();
  await page.goto(`${record}?designActivitiesOwner=foreign&designActivitiesSearch=absent&designActivitiesPage=2`);
  await expect(section.getByRole("link", { name: "Open Activity: Child Activity 1", exact: true })).toBeVisible();
});

test("creating a child reveals it after the authoritative refresh and clears only a conflicting local search", async ({ page }, info) => {
  test.setTimeout(90_000);
  setCount(11);
  await signIn(page, "kitchen.staff");
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto(`${record}?${new URLSearchParams({ planningReturn: "/activities?activitiesPage=4", designActivitiesOwner: id, designActivitiesSearch: "Later Office" })}`);
  await page.getByRole("button", { name: "Create Activity", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Activity name", exact: true }).fill("New visible child");
  await dialog.getByRole("textbox", { name: "Office", exact: true }).fill("New Office");
  await dialog.getByRole("button", { name: "Scheduled date", exact: true }).click();
  await page.locator('[data-slot="calendar"] button[data-day]:not([disabled])').first().click();
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/activity-designs/**", async route => {
    if (route.request().method() === "POST") await pending;
    await route.continue();
  });
  await dialog.getByRole("button", { name: "Create Activity", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /Creating/ })).toBeDisabled();
  await expect(page).toHaveURL(/designActivitiesSearch=Later\+Office/);
  release();
  await expect(dialog).toHaveCount(0);
  const newChild = page.getByRole("link", { name: "Open Activity: New visible child", exact: true });
  await expect(newChild).toBeFocused();
  await expect(page).toHaveURL(/planningReturn=%2Factivities%3FactivitiesPage%3D4/);
  await expect(page).not.toHaveURL(/designActivitiesSearch|designActivitiesCreated/);
  await expect(page.getByText("Activity search cleared to show the new Activity.", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("created-child-focus-320.png"), fullPage: true, animations: "disabled" });
});

test("deletion clamps only the Design child page after success and returns focus to creation", async ({ page }, info) => {
  setCount(11);
  await signIn(page, "municipal.admin");
  await page.goto(`${record}?${new URLSearchParams({ planningReturn: "/activities?activitiesPage=4", designActivitiesOwner: id, designActivitiesPage: "2" })}`);
  await expect(page.getByText("Showing 11 to 11 of 11 results", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actions for Child Activity 1", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete Activity", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Activities (10)", exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/designActivitiesPage=/);
  await expect(page).toHaveURL(/planningReturn=%2Factivities%3FactivitiesPage%3D4/);
  await expect(page.getByRole("button", { name: "Create Activity", exact: true })).toBeFocused();
  await page.screenshot({ path: info.outputPath("deleted-child-clamp.png"), fullPage: true, animations: "disabled" });
});

test("expanded tablet navigation leaves scoped child finding and keyboard pagination usable", async ({ page }, info) => {
  test.setTimeout(90_000);
  setCount(25);
  for (const username of ["municipal.admin", "kitchen.staff"]) {
    await page.context().clearCookies();
    await signIn(page, username);
    await page.setViewportSize({ width: 900, height: 600 });
    await page.goto(record);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    const toggle = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
    if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const search = page.getByRole("searchbox");
    await search.fill("Later Office");
    await expect(page.getByRole("link", { name: "Open Activity: Child Activity 1", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear Activity search", exact: true }).click();
    await expect(search).toBeFocused();
    const next = page.getByRole("button", { name: "Next page", exact: true });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Showing 11 to 20 of 25 results", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`${username}-expanded-tablet.png`), fullPage: true, animations: "disabled" });
  }
});
