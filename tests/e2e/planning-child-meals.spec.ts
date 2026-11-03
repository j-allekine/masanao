import Database from "better-sqlite3";
import { expect, test, type Page } from "@playwright/test";

const design = "child-meals-285";
const activity = `${design}-activity`;
const record = `/activity-designs/${design}/activities/${activity}`;
const catalog = "/activities?activitiesSearch=Kitchen&activitiesPage=4";
const preserved = { planningReturn: catalog, designActivitiesOwner: design, designActivitiesSearch: "Kitchen", designActivitiesPage: "2" };
function database() { return new Database(process.env.MASANAO_E2E_DATABASE_PATH!); }
function setCount(count: number) {
  const db = database();
  db.prepare("DELETE FROM meal_schedule WHERE activityId=?").run(activity);
  const insert = db.prepare("INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES(?,?,?,?,'2026-11-01','2026-11-01')");
  for (let n = 1; n <= count; n++) insert.run(`${activity}-${String(n).padStart(3, "0")}`, activity, n === 25 ? `Meal 25 ${"Community custom meal ".repeat(4)}`.slice(0, 100) : `Meal ${String(n).padStart(2, "0")}`, n === 25 ? "23:45" : "12:00");
  db.close();
}
async function signIn(page: Page, username: string) {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username, password: username === "municipal.admin" ? "administrator-password" : "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
}

test.beforeAll(() => {
  const db = database();
  db.prepare("INSERT INTO activity_design(id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES(?,'CHILD-285','Meal child finding',2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(design);
  db.prepare("INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES(?,?,'Kitchen Activity','Kitchen','2026-11-01',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(activity, design);
  db.close();
});
test.afterAll(() => { setCount(0); const db = database(); db.prepare("DELETE FROM activity WHERE id=?").run(activity); db.prepare("DELETE FROM activity_design WHERE id=?").run(design); db.close(); });

for (const username of ["municipal.admin", "kitchen.staff"]) test(`${username} finds complete Meal children with independent safe history and parent focus`, async ({ page, context }, info) => {
  test.setTimeout(180_000);
  await signIn(page, username);
  const section = page.getByRole("region", { name: /^Meal Schedules \(/ });
  for (const count of [0, 1, 10, 11, 25]) {
    setCount(count);
    await page.goto(record);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await expect(section.getByRole("heading", { name: `Meal Schedules (${count})`, exact: true })).toBeVisible();
    await expect(section.getByRole("searchbox")).toHaveCount(count > 10 ? 1 : 0);
    await expect(section.getByRole("link", { name: /^Open Meal Schedule:/ })).toHaveCount(Math.min(10, count));
  }
  const tieDb = database();
  tieDb.prepare("UPDATE meal_schedule SET label='Shared custom meal' WHERE id IN (?,?)").run(`${activity}-023`, `${activity}-024`); tieDb.close();
  await page.goto(`${record}?mealSchedulesOwner=${activity}&mealSchedulesSearch=Shared`);
  const tied = section.getByRole("link", { name: "Open Meal Schedule: Shared custom meal", exact: true });
  await expect(tied).toHaveCount(2);
  const stable = await tied.evaluateAll(links => links.map(link => link.getAttribute("href")));
  expect(stable[0]).toContain(`${activity}-023`); expect(stable[1]).toContain(`${activity}-024`);
  await page.reload(); await expect(tied).toHaveCount(2); expect(await tied.evaluateAll(links => links.map(link => link.getAttribute("href")))).toEqual(stable);
  setCount(25);
  for (const width of [1280, 900, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 480 : 650 });
    await page.goto(`${record}?${new URLSearchParams(preserved)}`);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    if (width === 900) {
      const toggle = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
      if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
    }
    const search = section.getByRole("searchbox");
    await search.fill("23:45");
    await expect(section.getByRole("link", { name: /^Open Meal Schedule: Meal 25 / })).toBeVisible();
    await search.fill("absent");
    await expect(section).toContainText("No matching Meal Schedules");
    await section.getByRole("button", { name: "Clear Meal Schedule search", exact: true }).click();
    await expect(search).toBeFocused();
    const next = section.getByRole("button", { name: "Next page", exact: true });
    await next.focus(); await page.keyboard.press("Enter");
    await expect(section).toContainText("Showing 11 to 20 of 25 results");
    await page.reload();
    const row = section.getByRole("link", { name: "Open Meal Schedule: Meal 11", exact: true });
    const href = (await row.getAttribute("href"))!;
    expect(href).toContain("mealSchedulesPage=2");
    expect(href).toContain("designActivitiesPage=2");
    const other = await context.newPage();
    await other.goto(href);
    await expect(other.getByRole("heading", { level: 1 })).toContainText("Meal 11", { timeout: 30_000 });
    const parent = other.getByRole("navigation", { name: "breadcrumb", exact: true }).getByRole("link", { name: "Kitchen Activity", exact: true });
    expect((await parent.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    const parentHref = (await parent.getAttribute("href"))!;
    await parent.click();
    await expect(other).toHaveURL(new URL(parentHref, other.url()).href, { timeout: 30_000 });
    await expect(other.getByRole("link", { name: "Open Meal Schedule: Meal 11", exact: true })).toBeFocused();
    await expect(other).toHaveURL(/designActivitiesPage=2/);
    await expect(other).toHaveURL(/planningReturn=/);
    await other.close();
    await row.click();
    await expect(page).toHaveURL(new URL(href, page.url()).href, { timeout: 30_000 });
    await page.goBack();
    await expect(section).toContainText("Showing 11 to 20 of 25 results");
    await page.goForward();
    await expect(page).toHaveURL(new URL(href, page.url()).href, { timeout: 30_000 });
    await page.goBack();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${username}-${width}-meal-page2.png`), fullPage: true, animations: "disabled" });
  }
  await page.goto(`${record}?mealSchedulesOwner=foreign&mealSchedulesPage=2&mealSchedulesSearch=absent`);
  await expect(section.getByRole("link", { name: "Open Meal Schedule: Meal 01", exact: true })).toBeVisible();
  setCount(1);
  await page.goto(`${record}?mealSchedulesOwner=${activity}&mealSchedulesSearch=absent&mealSchedulesPage=99`);
  await expect(section).toContainText("No matching Meal Schedules");
  await expect(section.getByRole("button", { name: "Clear Meal Schedule search", exact: true })).toBeVisible();
});

test("Meal creation recovers failure then reveals only after delayed authoritative success", async ({ page }, info) => {
  test.setTimeout(90_000);
  setCount(11); await signIn(page, "kitchen.staff");
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto(`${record}?${new URLSearchParams({ ...preserved, mealSchedulesOwner: activity, mealSchedulesSearch: "Meal 01" })}`);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Add Meal Schedule", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Meal Schedule label", exact: false }).fill("Late custom meal");
  await dialog.locator('input[type="time"]').fill("23:59");
  await page.route("**/activity-designs/**", route => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await dialog.getByRole("button", { name: "Add Meal Schedule", exact: true }).click();
  await expect(dialog).toContainText("could not be saved");
  await expect(dialog.getByRole("textbox", { name: "Meal Schedule label", exact: false })).toHaveValue("Late custom meal");
  await page.unroute("**/activity-designs/**");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/activity-designs/**", async route => { if (route.request().method() === "POST") await gate; await route.continue(); });
  await dialog.getByRole("button", { name: "Add Meal Schedule", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /Adding…/ })).toBeDisabled();
  await expect(page).toHaveURL(/mealSchedulesSearch=Meal\+01/);
  release();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open Meal Schedule: Late custom meal", exact: true })).toBeFocused();
  await expect(page).toHaveURL(/mealSchedulesPage=2/);
  await expect(page).toHaveURL(/designActivitiesSearch=Kitchen/);
  await expect(page).not.toHaveURL(/mealSchedulesSearch|mealSchedulesCreated/);
  await expect(page.getByText("Meal Schedule search cleared to show the new Meal Schedule.", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("created-meal-visible-320.png"), fullPage: true });
});

test("Meal deletion clamps its page and missing or renamed return rows fall back safely", async ({ page }, info) => {
  test.setTimeout(90_000);
  setCount(11); await signIn(page, "municipal.admin");
  await page.goto(`${record}?${new URLSearchParams({ ...preserved, mealSchedulesOwner: activity, mealSchedulesPage: "2" })}`);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Actions for Meal 11", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete Meal Schedule", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Meal Schedules (10)", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Meal Schedule", exact: true })).toBeFocused();
  await expect(page).not.toHaveURL(/mealSchedulesPage=/);
  await expect(page).toHaveURL(/designActivitiesPage=2/);
  for (const suffix of [`#open-child-meal-${activity}-011`, `&mealSchedulesOwner=${activity}&mealSchedulesSearch=absent#open-child-meal-${activity}-001`]) {
    await page.goto(`${record}?${new URLSearchParams(preserved)}${suffix}`);
    await expect(page.getByRole("heading", { name: "Meal Schedules (10)", exact: true })).toBeFocused();
  }
  const renamedDb = database(); renamedDb.prepare("UPDATE meal_schedule SET label='Renamed custom meal' WHERE id=?").run(`${activity}-001`); renamedDb.close();
  await page.goto(`${record}/meal-schedules/${activity}-001?${new URLSearchParams({ ...preserved, mealSchedulesOwner: activity, mealSchedulesSearch: "Meal 01" })}`);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  const returnLink = page.getByRole("navigation", { name: "breadcrumb", exact: true }).getByRole("link", { name: "Kitchen Activity", exact: true });
  await returnLink.click();
  await expect(page.getByRole("heading", { name: "Meal Schedules (10)", exact: true })).toBeFocused({ timeout: 30_000 });
  await expect(page.getByText("No matching Meal Schedules", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("deleted-meal-fallback.png"), fullPage: true });
});

test("short Planning parent labels provide separate forty pixel touch targets", async ({ page }, info) => {
  test.setTimeout(60_000); setCount(1); await signIn(page, "kitchen.staff");
  const db = database(); db.prepare("UPDATE activity SET name='A' WHERE id=?").run(activity); db.prepare("UPDATE activity_design SET activityDesignNo='1' WHERE id=?").run(design); db.close();
  try {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(`${record}/meal-schedules/${activity}-001`);
    await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
    const nav = page.getByRole("navigation", { name: "breadcrumb", exact: true });
    const parent = nav.getByRole("link", { name: "A", exact: true });
    const box = (await parent.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(40); expect(box.height).toBeGreaterThanOrEqual(40);
    const toggle = nav.getByRole("button", { name: "Show ancestors", exact: true });
    const toggleBox = (await toggle.boundingBox())!; expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(box.x);
    await toggle.click(); const ancestor = page.getByRole("menuitem", { name: "1", exact: true });
    await expect.poll(async () => (await ancestor.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(40);
    const ancestorBox = (await ancestor.boundingBox())!; expect(ancestorBox.width).toBeGreaterThanOrEqual(40);
    await page.keyboard.press("Escape"); await parent.focus(); await expect(parent).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("short-parent-targets-320.png"), fullPage: true });
  } finally { const db = database(); db.prepare("UPDATE activity SET name='Kitchen Activity' WHERE id=?").run(activity); db.prepare("UPDATE activity_design SET activityDesignNo='CHILD-285' WHERE id=?").run(design); db.close(); }
});

test("legacy Meal issuance bookmarks retain validated child and catalog namespaces", async ({ page }) => {
  test.setTimeout(60_000); setCount(1); await signIn(page, "kitchen.staff");
  await page.goto(`${record}/meal-schedules/${activity}-001/issuance?${new URLSearchParams({ ...preserved, mealSchedulesOwner: activity, mealSchedulesSearch: "Meal 01", mealSchedulesPage: "99", foreign: "discarded" })}`);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(`${record}/meal-schedules/${activity}-001`);
  expect(new URL(page.url()).searchParams.get("mealSchedulesSearch")).toBe("Meal 01");
  expect(new URL(page.url()).searchParams.get("designActivitiesPage")).toBe("2");
  expect(new URL(page.url()).searchParams.has("foreign")).toBe(false);
  const parent = page.getByRole("navigation", { name: "breadcrumb", exact: true }).getByRole("link", { name: "Kitchen Activity", exact: true });
  await parent.click();
  await expect(page.getByRole("link", { name: "Open Meal Schedule: Meal 01", exact: true })).toBeFocused({ timeout: 30_000 });
  await expect(page).not.toHaveURL(/mealSchedulesPage=/);
});

test("changing a returned Meal page keeps the new page on reload", async ({ page }) => {
  test.setTimeout(60_000); setCount(25); await signIn(page, "kitchen.staff");
  await page.goto(`${record}?mealSchedulesOwner=${activity}&mealSchedulesPage=2#open-child-meal-${activity}-011`);
  await expect(page.getByRole("link", { name: "Open Meal Schedule: Meal 11", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Showing 21 to 25 of 25 results", { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page.reload();
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await expect(page.getByText("Showing 21 to 25 of 25 results", { exact: true })).toBeVisible();
  await page.getByRole("searchbox").fill("Meal 25");
  await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("link", { name: "Open Meal Schedule: Meal 11", exact: true })).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("searchbox")).toHaveValue("Meal 25");
});


for (const leavesResults of [true, false]) test(`editing a searched Meal restores settled ${leavesResults ? "fallback" : "row"} focus`, async ({ page }) => {
  setCount(11);
  await signIn(page, "kitchen.staff");
  await page.goto(`${record}?${new URLSearchParams({ ...preserved, mealSchedulesOwner: activity, mealSchedulesSearch: "Meal", mealSchedulesPage: "2" })}`);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  const trigger = page.locator(`[id="meal-schedule-actions-${activity}-011"]`);
  await trigger.click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Meal Schedule label", exact: true }).fill(leavesResults ? "Renamed lunch" : "Meal repaired");
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  if (leavesResults) {
    await expect(trigger).toHaveCount(0);
    await expect(page.locator("#activity-meal-schedules-title")).toBeFocused();
  } else {
    await expect(trigger).toBeFocused();
  }
  expect(new URL(page.url()).searchParams.get("mealSchedulesSearch")).toBe("Meal");
  expect(new URL(page.url()).searchParams.get("designActivitiesSearch")).toBe("Kitchen");
  expect(new URL(page.url()).searchParams.get("designActivitiesPage")).toBe("2");
  expect(new URL(page.url()).searchParams.get("planningReturn")).toBe(catalog);
});
