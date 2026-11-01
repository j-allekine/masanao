import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const prefix = "pagination-reflow";
// Only the generated, disposable database supplied by the existing E2E setup.
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.transaction(() => {
      for (let n = 1; n <= 25; n++) {
        const id = `${prefix}-${String(n).padStart(2, "0")}`;
        const name = `Reflow ${String(n).padStart(2, "0")}`;
        if (n <= 12) db.prepare("INSERT INTO item(id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES(?,?,?,'default-category-staples-dry-goods','default-unit-kilogram','0',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, name, name.toLowerCase());
        db.prepare("INSERT INTO recipe(id,name,normalizedName,isActive,createdAt,updatedAt) VALUES(?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, name, name.toLowerCase());
        for (const table of ["category", "office", "vendor"]) db.prepare(`INSERT INTO ${table}(id,name,normalizedName,isActive,createdAt,updatedAt) VALUES(?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(id, name, name.toLowerCase());
        db.prepare("INSERT INTO unit(id,name,normalizedName,abbreviation,normalizedAbbreviation,createdAt,updatedAt) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, name, name.toLowerCase(), `rf${n}`, `rf${n}`);
        db.prepare("INSERT INTO activity_design(id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES(?,?,?,2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, `REFLOW-${n}`, name);
        db.prepare("INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES(?, ?,?,'Kitchen','2020-10-15T00:00:00.000Z',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, `${prefix}-01`, name);
        db.prepare("INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES(?, ?,?,'12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, `${prefix}-01`, name);
        db.prepare("INSERT INTO purchase_order(id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES(?,?,?, ?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, `REFLOW-${n}`, `reflow-${n}`, `${prefix}-01`);
        db.prepare("INSERT INTO delivery_receipt(id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES(?, ?,?,'Reflow vendor','REFLOW-1',?,?,'2026-11-01',CURRENT_TIMESTAMP)").run(id, `${prefix}-01`, `${prefix}-01`, `REFLOW-${n}`, `reflow-${n}`);
      }
    })();
  } finally { db.close(); }
});
test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try { db.transaction(() => {
    for (const table of ["delivery_receipt", "purchase_order", "meal_schedule", "activity", "activity_design", "item", "recipe", "unit", "category", "office", "vendor"]) db.prepare(`DELETE FROM ${table} WHERE id LIKE ?`).run(`${prefix}-%`);
  })(); } finally { db.close(); }
});

const consumers = [
  ["Items", "/items"], ["Inventory", "/inventory"], ["Recipes", "/recipes"],
  ["Designs", "/activity-designs"], ["Activities", "/activities"],
  ["Design children", `/activity-designs/${prefix}-01`],
  ["Meal children", `/activity-designs/${prefix}-01/activities/${prefix}-01`],
  ["Purchase Orders", "/purchase-orders"], ["Receipt history", `/purchase-orders/${prefix}-01`],
  ["Units", "/master-data?tab=units"], ["Categories", "/master-data?tab=categories"],
  ["Offices", "/master-data?tab=offices"], ["Vendors", "/master-data?tab=vendors"],
  ["Dashboard", "/dashboard?start=2020-10-01&end=2020-10-31"],
] as const;

for (const [name, url] of consumers) test(`${name} pagination reflows with growing targets and keyboard paging`, async ({ page, context }, info) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "sidebar_state", value: "true", url: process.env.BETTER_AUTH_URL! }]);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto(url);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  if (["Units", "Categories", "Offices", "Vendors"].includes(name)) await page.getByRole("tab", { name, exact: true }).click();
  const nav = page.getByRole("navigation", { name: "pagination", exact: true });
  await expect(nav).toBeVisible({ timeout: 30_000 });
  await page.addStyleTag({ content: "nextjs-portal { display:none !important }" });
  for (const [width, enlarged] of [[320, true], [320, false], [900, false], [639, false], [640, false], [900, true]] as const) {
    await page.setViewportSize({ width, height: 480 });
    await page.evaluate(value => { document.documentElement.style.fontSize = value ? "200%" : "100%"; }, enlarged);
    const next = nav.getByRole("button", { name: "Next page", exact: true });
    await next.scrollIntoViewIfNeeded();
    const geometry = await nav.evaluate(element => {
      const root = element.parentElement!;
      const rect = root.getBoundingClientRect();
      const buttons = [...element.querySelectorAll("button")].filter(button => button.getClientRects().length > 0).map(button => {
        const box = button.getBoundingClientRect();
        return { label: button.getAttribute("aria-label"), left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      });
      return { viewport: innerWidth, navWidth: element.scrollWidth, navClient: element.clientWidth, left: rect.left, right: rect.right, buttons };
    });
    await info.attach(`${width}-${enlarged}-geometry`, { body: JSON.stringify(geometry), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath(`${width}-${enlarged ? "200" : "100"}.png`), animations: "disabled" });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.navWidth).toBeLessThanOrEqual(geometry.navClient + 1);
    const pageCount = Number(geometry.buttons.find(button => button.label?.startsWith("Page "))!.label!.split(" of ")[1]);
    expect(geometry.buttons.filter(button => button.label?.startsWith("Page "))).toHaveLength(Math.min(3, pageCount));
    for (const button of geometry.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
      expect(button.height).toBeGreaterThanOrEqual(enlarged ? 80 : 40);
      expect(button.left).toBeGreaterThanOrEqual(geometry.left - 1);
      expect(button.right).toBeLessThanOrEqual(geometry.right + 1);
    }
    for (let a = 0; a < geometry.buttons.length; a++) for (let b = a + 1; b < geometry.buttons.length; b++) {
      const x = geometry.buttons[a], y = geometry.buttons[b];
      expect(x.right <= y.left + 1 || y.right <= x.left + 1 || x.bottom <= y.top + 1 || y.bottom <= x.top + 1).toBe(true);
    }
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(nav.locator('[aria-current="page"]:visible')).toHaveAttribute("aria-label", /^Page 2 of/);
    const previous = nav.getByRole("button", { name: "Previous page", exact: true });
    await previous.focus(); await page.keyboard.press("Enter");
    await expect(nav.locator('[aria-current="page"]:visible')).toHaveAttribute("aria-label", /^Page 1 of/);
  }
});
