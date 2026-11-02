import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

function database() {
  const path = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!path) throw new Error("Missing isolated E2E database");
  return new Database(path);
}
function fixture() {
  const key = randomUUID().slice(0, 8);
  const prefix = `combined-planning-288-${key}`;
  const designs = Array.from({ length: 11 }, (_, n) => `${prefix}-design-${String(n + 1).padStart(3, "0")}`);
  const design = designs[10];
  const activities = Array.from({ length: 11 }, (_, n) => `${prefix}-activity-${String(n + 1).padStart(3, "0")}`);
  const activity = activities[0];
  const meals = Array.from({ length: 11 }, (_, n) => `${prefix}-meal-${String(n + 1).padStart(3, "0")}`);
  const meal = meals[10];
  const catalogSearch = `Catalog chain ${key}`;
  const designSearch = `Design branch ${key}`;
  const mealSearch = `Meal lane ${key}`;
  const title = `${catalogSearch} 11`;
  const number = `P288-${key}-11`;
  const activityName = `${designSearch} 01`;
  const mealName = `${mealSearch} 11`;
  const db = database();
  try { db.transaction(() => {
    designs.forEach((id, n) => db.prepare("INSERT INTO activity_design(id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES(?,?,?,2026,'2026-11-01','2026-11-01')").run(id, `P288-${key}-${String(n + 1).padStart(2, "0")}`, `${catalogSearch} ${String(n + 1).padStart(2, "0")}`));
    activities.forEach((id, n) => db.prepare("INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES(?,?,?,'Kitchen','2026-11-01','2026-11-01','2026-11-01')").run(id, design, `${designSearch} ${String(n + 1).padStart(2, "0")}`));
    meals.forEach((id, n) => db.prepare("INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES(?,?,?,'12:00','2026-11-01','2026-11-01')").run(id, activity, `${mealSearch} ${String(n + 1).padStart(2, "0")}`));
  })(); } finally { db.close(); }
  return { designs, design, activities, activity, meals, meal, catalogSearch, designSearch, mealSearch, title, number, activityName, mealName };
}
type Fixture = ReturnType<typeof fixture>;
function mutate(sql: string, ...ids: string[]) { const db = database(); try { db.prepare(sql).run(...ids); } finally { db.close(); } }
function cleanup(f: Fixture) {
  const db = database();
  try { db.transaction(() => {
    f.meals.forEach(id => db.prepare("DELETE FROM meal_schedule WHERE id=?").run(id));
    f.activities.forEach(id => db.prepare("DELETE FROM activity WHERE id=?").run(id));
    f.designs.forEach(id => db.prepare("DELETE FROM activity_design WHERE id=?").run(id));
  })(); } finally { db.close(); }
}
async function ready(page: Page, leaf = false) {
  await expect(page.locator(leaf ? '[data-issuance-ready="true"]' : '[data-client-ready="true"]')).toBeVisible({ timeout: 30_000 });
}
async function signIn(page: Page, username: string) {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username, password: username === "municipal.admin" ? "administrator-password" : "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
}
const designSection = (page: Page) => page.getByRole("region", { name: /^Activities \(/ });
const mealSection = (page: Page) => page.getByRole("region", { name: /^Meal Schedules \(/ });
const activityLink = (page: Page, f: Fixture) => page.getByRole("link", { name: `Open Activity: ${f.activityName}`, exact: true });
const mealLink = (page: Page, f: Fixture) => page.getByRole("link", { name: `Open Meal Schedule: ${f.mealName}`, exact: true });
function state(url: string, f: Fixture, level: "design" | "activity" | "meal", designPage = "2", mealPage = "2") {
  const parsed = new URL(url, "http://localhost");
  const params = parsed.searchParams;
  expect(parsed.pathname).toBe(`/activity-designs/${f.design}${level === "design" ? "" : `/activities/${f.activity}${level === "meal" ? `/meal-schedules/${f.meal}` : ""}`}`);
  const expected: Record<string, string> = { designActivitiesOwner: f.design, designActivitiesSearch: f.designSearch };
  if (designPage !== "1") expected.designActivitiesPage = designPage;
  expected.mealSchedulesOwner = f.activity; expected.mealSchedulesSearch = f.mealSearch;
  if (mealPage !== "1") expected.mealSchedulesPage = mealPage;
  for (const [key, value] of Object.entries(expected)) expect(params.getAll(key), key).toEqual([value]);
  if (designPage === "1") expect(params.has("designActivitiesPage")).toBe(false);
  if (mealPage === "1") expect(params.has("mealSchedulesPage")).toBe(false);
  expect(params.getAll("planningReturn")).toHaveLength(1);
  const catalog = new URL(params.get("planningReturn")!, "http://localhost");
  expect(catalog.pathname).toBe("/activity-designs");
  expect(catalog.searchParams.size).toBe(2);
  expect(catalog.searchParams.getAll("activityDesignsSearch")).toEqual([f.catalogSearch]);
  expect(catalog.searchParams.getAll("activityDesignsPage")).toEqual(["2"]);
  for (const key of params.keys()) expect(key).not.toMatch(/Created|Notice/);
}
async function ancestor(page: Page, name: string) {
  const nav = page.getByRole("navigation", { name: "breadcrumb", exact: true });
  const link = nav.getByRole("link", { name, exact: true });
  if (await link.isVisible()) { await expect(link).toBeEnabled(); await link.click(); }
  else { await nav.getByRole("button", { name: "Show ancestors", exact: true }).click(); await page.getByRole("menuitem", { name, exact: true }).click(); }
  await ready(page);
}
async function establish(page: Page, f: Fixture) {
  await page.goto("/activity-designs"); await ready(page);
  await page.getByRole("searchbox", { name: "Search Activity Designs", exact: true }).fill(f.catalogSearch);
  await expect(page.getByText("Showing 1 to 10 of 11 results", { exact: true })).toBeVisible();
  const next = page.getByRole("button", { name: "Next page", exact: true });
  await expect(next).toBeEnabled(); await next.focus(); await next.press("Enter");
  await expect(page.getByText("Showing 11 to 11 of 11 results", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: f.title, exact: true }).click(); await ready(page);
  await designSection(page).getByRole("searchbox").fill(f.designSearch);
  await expect(designSection(page)).toContainText("Showing 1 to 10 of 11 results");
  await designSection(page).getByRole("button", { name: "Next page", exact: true }).press("Enter");
  await expect(designSection(page)).toContainText("Showing 11 to 11 of 11 results");
  if (page.viewportSize()!.width === 320) await expect.poll(async () => (await designSection(page).getByRole("searchbox").boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(160);
  await activityLink(page, f).click(); await ready(page);
  await mealSection(page).getByRole("searchbox").fill(f.mealSearch);
  await expect(mealSection(page)).toContainText("Showing 1 to 10 of 11 results");
  await mealSection(page).getByRole("button", { name: "Next page", exact: true }).press("Enter");
  await expect(mealSection(page)).toContainText("Showing 11 to 11 of 11 results");
  if (page.viewportSize()!.width === 320) await expect.poll(async () => (await mealSection(page).getByRole("searchbox").boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(160);
  const href = (await mealLink(page, f).getAttribute("href"))!;
  state(href, f, "meal");
  await mealLink(page, f).click(); await ready(page, true);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${f.mealName} · 12:00`);
  state(page.url(), f, "meal");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  return new URL(href, page.url()).href;
}
async function activityState(page: Page, f: Fixture, focused = true) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(`/activity-designs/${f.design}/activities/${f.activity}`);
  await ready(page); state(page.url(), f, "activity");
  await expect(mealSection(page).getByRole("searchbox")).toHaveValue(f.mealSearch);
  await expect(mealSection(page)).toContainText("Showing 11 to 11 of 11 results");
  if (focused) await expect(mealLink(page, f)).toBeFocused();
}
async function designState(page: Page, f: Fixture, focused = true) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(`/activity-designs/${f.design}`);
  await ready(page); state(page.url(), f, "design");
  await expect(designSection(page).getByRole("searchbox")).toHaveValue(f.designSearch);
  await expect(designSection(page)).toContainText("Showing 11 to 11 of 11 results");
  if (focused) await expect(activityLink(page, f)).toBeFocused();
}
async function reopen(page: Page, f: Fixture) {
  await activityLink(page, f).click(); await activityState(page, f, false);
  await mealLink(page, f).click(); await ready(page, true); state(page.url(), f, "meal");
}
async function catalogState(page: Page, f: Fixture) {
  await expect(page.getByRole("searchbox", { name: "Search Activity Designs", exact: true })).toHaveValue(f.catalogSearch);
  await expect(page.getByText("Showing 11 to 11 of 11 results", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Actions for ${f.title}`, exact: true })).toBeFocused();
  const params = new URL(page.url()).searchParams;
  expect(params.size).toBe(2);
  expect(params.getAll("activityDesignsSearch")).toEqual([f.catalogSearch]);
  expect(params.getAll("activityDesignsPage")).toEqual(["2"]);
}

for (const [username, width] of [["municipal.admin", 1280], ["kitchen.staff", 1280], ["municipal.admin", 320], ["kitchen.staff", 320]] as const) {
  test(`${username} combined independent Planning returns at ${width}px`, async ({ page, context }, info) => {
    test.setTimeout(180_000); const f = fixture();
    try {
      await page.setViewportSize({ width, height: width === 320 ? 480 : 720 }); await signIn(page, username);
      const leaf = await establish(page, f);
      await page.reload(); await ready(page, true); state(page.url(), f, "meal");
      await page.screenshot({ path: info.outputPath("meal-draft.png"), fullPage: true });
      await ancestor(page, f.activityName); await activityState(page, f);
      await page.screenshot({ path: info.outputPath("activity-page2.png"), fullPage: true });
      await ancestor(page, f.number); await designState(page, f);
      await page.screenshot({ path: info.outputPath("design-page2.png"), fullPage: true });
      await reopen(page, f);
      await ancestor(page, f.number); await designState(page, f); await reopen(page, f);
      await ancestor(page, "Activity Designs"); await catalogState(page, f);
      await page.screenshot({ path: info.outputPath("catalog-page2.png"), fullPage: true });
      const other = await context.newPage();
      try {
        await other.setViewportSize({ width, height: width === 320 ? 480 : 720 });
        await other.goto(leaf); await ready(other, true); state(other.url(), f, "meal");
        await ancestor(other, f.activityName); await activityState(other, f);
        await ancestor(other, f.number); await designState(other, f);
        await ancestor(other, "Activity Designs"); await catalogState(other, f);
      } finally { await other.close(); }
      // A catalog return deliberately drops child context. Establish it again through real controls.
      await establish(page, f);
      await ancestor(page, f.number); await designState(page, f);
      await reopen(page, f);
      await page.goBack(); await activityState(page, f, false);
      await page.goBack(); await designState(page, f, false);
      await page.goForward(); await activityState(page, f, false);
      await page.goForward(); await ready(page, true); state(page.url(), f, "meal");
      await ancestor(page, f.activityName); await activityState(page, f);
      const returned = page.url();
      await ancestor(page, f.number); await designState(page, f);
      await page.goBack(); await expect(page).toHaveURL(returned); await activityState(page, f);
      await page.goForward(); await designState(page, f);
      await reopen(page, f); await ancestor(page, f.activityName); await activityState(page, f);
      await mealSection(page).getByRole("searchbox").fill(`${f.mealSearch} 01`);
      await expect(mealSection(page).getByRole("link", { name: `Open Meal Schedule: ${f.mealSearch} 01`, exact: true })).toBeVisible();
      await expect.poll(() => new URL(page.url()).hash).toBe("");
      await page.reload(); await ready(page);
      await expect(mealSection(page).getByRole("searchbox")).toHaveValue(`${f.mealSearch} 01`);
      const params = new URL(page.url()).searchParams;
      expect(params.get("designActivitiesSearch")).toBe(f.designSearch); expect(params.get("designActivitiesPage")).toBe("2");
      expect(new URL(params.get("planningReturn")!, page.url()).searchParams.get("activityDesignsSearch")).toBe(f.catalogSearch);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`combined-${username}-${width}.png`), fullPage: true });
    } finally { cleanup(f); }
  });
}

for (const collection of ["meal", "activity", "catalog"] as const) for (const change of ["renamed", "deleted"] as const) {
  test(`${change} ${collection} return preserves independent context and safely clamps`, async ({ page }, info) => {
    test.setTimeout(120_000); const f = fixture();
    try {
      await signIn(page, "kitchen.staff"); await establish(page, f);
      if (collection !== "meal") await ancestor(page, f.activityName);
      if (collection === "catalog") await ancestor(page, f.number);
      const parentName = collection === "meal" ? f.activityName : collection === "activity" ? f.number : "Activity Designs";
      const parent = page.getByRole("navigation", { name: "breadcrumb", exact: true }).getByRole("link", { name: parentName, exact: true });
      const href = (await parent.getAttribute("href"))!;
      if (change === "renamed") {
        mutate(collection === "meal" ? "UPDATE meal_schedule SET label='Renamed' WHERE id=?" : collection === "activity" ? "UPDATE activity SET name='Renamed' WHERE id=?" : "UPDATE activity_design SET title='Renamed' WHERE id=?", collection === "meal" ? f.meal : collection === "activity" ? f.activity : f.design);
        await page.reload(); await ready(page, collection === "meal"); await ancestor(page, parentName);
      } else {
        await page.goto("/activity-designs"); await ready(page);
        if (collection !== "meal") f.meals.forEach(id => mutate("DELETE FROM meal_schedule WHERE id=?", id));
        if (collection === "catalog") f.activities.forEach(id => mutate("DELETE FROM activity WHERE id=?", id));
        mutate(`DELETE FROM ${collection === "meal" ? "meal_schedule" : collection === "activity" ? "activity" : "activity_design"} WHERE id=?`, collection === "meal" ? f.meal : collection === "activity" ? f.activity : f.design);
        await page.goto(href); await ready(page);
      }
      const count = change === "renamed" ? 11 : 10;
      if (collection === "meal") {
        await expect(page.getByRole("heading", { name: `Meal Schedules (${count})`, exact: true })).toBeFocused();
        await expect(mealSection(page).getByRole("searchbox")).toHaveValue(f.mealSearch);
        state(page.url(), f, "activity", "2", "1");
        await expect(mealSection(page)).toContainText("Showing 1 to 10 of 10 results");
      } else if (collection === "activity") {
        await expect(page.getByRole("heading", { name: `Activities (${count})`, exact: true })).toBeFocused();
        await expect(designSection(page).getByRole("searchbox")).toHaveValue(f.designSearch);
        state(page.url(), f, "design", "1");
        await expect(designSection(page)).toContainText("Showing 1 to 10 of 10 results");
      } else {
        await expect(page.getByRole("searchbox", { name: "Search Activity Designs", exact: true })).toBeFocused();
        await expect(page.getByRole("searchbox", { name: "Search Activity Designs", exact: true })).toHaveValue(f.catalogSearch);
        await expect(page.getByText("Showing 1 to 10 of 10 results", { exact: true })).toBeVisible();
      }
      await page.screenshot({ path: info.outputPath(`${change}-${collection}-fallback.png`), fullPage: true });
    } finally { cleanup(f); }
  });
}
