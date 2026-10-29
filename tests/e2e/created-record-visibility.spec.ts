import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

function database() {
  const path = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!path) throw new Error("An isolated E2E database is required");
  return new Database(path);
}

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  });
  expect(response.status()).toBe(200);
}

test("a late Master Data mutation response does not undo a newer tab selection", async ({ page }) => {
  test.setTimeout(60_000);
  const db = database();
  let releaseResponse = () => {};
  let requestFinished = () => {};
  const heldResponse = new Promise<void>((resolve) => { releaseResponse = resolve; });
  const responseReady = new Promise<void>((resolve) => { requestFinished = resolve; });
  try {
    await signIn(page);
    await page.goto("/master-data");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.getByRole("tab", { name: "Vendors", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search Vendors", exact: true }).fill("Acme");
    await expect(page).toHaveURL(/tab=vendors&search=Acme$/);
    await page.route("**/master-data*", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      requestFinished();
      await heldResponse;
      await route.fulfill({ response });
    });
    await page.getByRole("button", { name: "Actions for Acme Foods", exact: true }).click();
    await page.getByRole("menuitem", { name: "Deactivate", exact: true }).click();
    await responseReady;
    const categories = page.getByRole("tab", { name: "Categories", exact: true });
    await categories.click();
    await expect(categories).toHaveAttribute("aria-selected", "true");
    releaseResponse();
    await expect(page.getByText("Vendor “Acme Foods” deactivated", { exact: true })).toBeVisible();
    await expect(categories).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/tab=categories$/);
    await page.getByRole("searchbox", { name: "Search Categories", exact: true }).fill("Dry");
    await expect(page).toHaveURL(/tab=categories&search=Dry$/);
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goBack();
    await expect(categories).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("searchbox", { name: "Search Categories", exact: true })).toHaveValue("Dry");
    await page.goForward();
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally {
    releaseResponse();
    await page.unrouteAll({ behavior: "wait" });
    db.prepare("UPDATE vendor SET isActive = 1 WHERE id = ?").run("e2e-vendor-acme");
    db.close();
  }
});

for (const width of [1280, 375]) {
  test(`reveals a new Item despite excluding search, Category, and status at ${width}px`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const db = database();
    const name = `ZZZ Visibility Item ${randomUUID()}`;
    for (let index = 0; index < 12; index++) {
      const id = `${name}-${index}`;
      db.prepare('INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
        .run(id, `A ${id}`, `a ${id}`.toLowerCase(), "default-category-staples-dry-goods", "default-unit-kilogram", "10");
    }
    try {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page);
      await page.goto("/items?view=compact&itemsSearch=missing&itemsCategory=default-category-produce&itemsStatus=inactive&itemsPage=2");
      await expect(page.locator('[data-items-ready="true"]')).toBeVisible();
      await page.getByRole("button", { name: "Create Item", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
      await dialog.getByRole("combobox", { name: "Category", exact: true }).click();
      await page.getByRole("option", { name: "Staples & Dry Goods", exact: true }).click();
      await dialog.getByRole("combobox", { name: "Base Unit", exact: true }).click();
      await page.getByRole("option", { name: "Kilogram (kg)", exact: true }).click();
      await dialog.getByLabel("Reorder level").fill("10");
      await dialog.getByRole("button", { name: "Create Item", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("searchbox")).toBeEmpty();
      await expect(page.getByText(name, { exact: true }).filter({ visible: true })).toBeVisible();
      await expect(page.getByText(name, { exact: true }).filter({ visible: true })).toBeInViewport();
      await expect(page.getByRole("button", { name: `Actions for ${name}`, exact: true })).toBeFocused();
      expect(new URL(page.url()).searchParams.has("itemsCategory")).toBe(false);
      expect(new URL(page.url()).searchParams.has("itemsStatus")).toBe(false);
      expect(new URL(page.url()).searchParams.get("view")).toBe("compact");
      expect(Number(new URL(page.url()).searchParams.get("itemsPage"))).toBeGreaterThan(1);
      await page.reload();
      await expect(page.locator('[data-items-ready="true"]')).toBeVisible();
      await expect(page.getByText(name, { exact: true }).filter({ visible: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`created-item-${width}.png`), fullPage: true });
    } finally {
      db.prepare("DELETE FROM item WHERE name = ?").run(name);
      db.prepare("DELETE FROM item WHERE id LIKE ?").run(`${name}%`);
      db.close();
    }
  });

  test(`opens new Planning records directly at ${width}px`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const db = database();
    const name = `Visibility Planning ${randomUUID()}`;
    try {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page);
      await page.goto("/activity-designs?activityDesignsSearch=missing&activityDesignsPage=2");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.locator("#new-activity-design").click();
      let dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Activity Design No.", exact: true }).fill(name);
      await dialog.getByRole("button", { name: "Fiscal Year", exact: true }).click();
      await page.getByRole("button", { name: "2026", exact: true }).click();
      await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(name);
      await dialog.getByRole("button", { name: "Create Activity Design", exact: true }).click();
      await expect(page).toHaveURL(/\/activity-designs\/[^/?]+(?:\?.*)?$/, { timeout: 30_000 });
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.screenshot({ path: info.outputPath(`created-design-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: "Create Activity", exact: true }).click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Activity name", exact: true }).fill(name + " Activity");
      await dialog.getByRole("textbox", { name: "Office", exact: true }).fill("Kitchen");
      await dialog.getByRole("button", { name: "Scheduled date", exact: true }).click();
      await page.locator('[data-slot="calendar"] button[data-day]').first().click();
      await dialog.getByRole("button", { name: "Create Activity", exact: true }).click();
      await expect(page).toHaveURL(/\/activities\/[^/?]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: name + " Activity", exact: true })).toBeVisible();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.screenshot({ path: info.outputPath(`created-activity-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: "Add Meal Schedule", exact: true }).last().click();
      dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Meal Schedule label", exact: true }).fill("Lunch");
      await dialog.locator("#mealScheduleTime").fill("12:00");
      await dialog.getByRole("button", { name: "Add Meal Schedule", exact: true }).click();
      await expect(page).toHaveURL(/\/meal-schedules\/[^/?]+(?:\?.*)?$/, { timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "Lunch · 12:00", exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`created-meal-${width}.png`), fullPage: true });
      await page.goBack();
      await expect(page.getByRole("heading", { name: name + " Activity", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Open Meal Schedule: Lunch", exact: true })).toBeVisible();
    } finally {
      const design = db.prepare("SELECT id FROM activity_design WHERE title = ?").get(name) as { id: string } | undefined;
      if (design) {
        db.prepare("DELETE FROM meal_schedule WHERE activityId IN (SELECT id FROM activity WHERE activityDesignId = ?)").run(design.id);
        db.prepare("DELETE FROM activity WHERE activityDesignId = ?").run(design.id);
        db.prepare("DELETE FROM activity_design WHERE id = ?").run(design.id);
      }
      db.close();
    }
  });
}

for (const width of [1280, 375]) {
  test(`reveals PO 444 first after creation from a filtered later page at ${width}px`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const db = database();
    const prefix = `visibility-po-${randomUUID()}`;
    for (let index = 0; index < 12; index++) {
      db.prepare('INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,?,?,?)')
        .run(`${prefix}-${index}`, `123-${prefix}-${index}`, `123-${prefix}-${index}`, "e2e-vendor-acme", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    }
    const number = `444-${prefix}`;
    try {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page);
      await page.goto(`/purchase-orders?view=compact&purchaseOrdersSearch=123-${prefix}&purchaseOrdersPage=2`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(page.getByText("Showing 11 to 12 of 12 results", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Create Purchase Order", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Purchase Order No.", exact: true }).fill(number);
      await dialog.getByRole("combobox", { name: "Vendor", exact: true }).click();
      await page.getByRole("option", { name: "Acme Foods", exact: true }).click();
      await dialog.getByRole("button", { name: "Create Purchase Order", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole("searchbox")).toBeEmpty();
      await expect(page).toHaveURL(/\/purchase-orders\?view=compact$/);
      const rows = page.locator(width < 640 ? '[data-purchase-orders-mobile] [data-purchase-order-id]' : '[data-purchase-orders-table-desktop] [data-purchase-order-id]');
      await expect(rows.first()).toContainText(number);
      await expect(rows.first()).toBeInViewport();
      await expect(page.getByRole("button", { name: `Actions for ${number}`, exact: true })).toBeFocused();
      await expect(page.getByText("Search cleared to show the new Purchase Order.", { exact: true })).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(/\/purchase-orders\?view=compact$/);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(rows.first()).toContainText(number);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`created-po-${width}.png`), fullPage: true });
    } finally {
      db.prepare("DELETE FROM purchase_order WHERE id LIKE ? OR purchaseOrderNo = ?").run(`${prefix}%`, number);
      db.close();
    }
  });

  for (const [tab, table, singular] of [
    ["units", "unit", "Unit"], ["categories", "category", "Category"],
    ["offices", "office", "Office"], ["vendors", "vendor", "Vendor"],
  ] as const) {
    test(`reveals created ${singular} on its alphabetical page at ${width}px`, async ({ page }, info) => {
      test.setTimeout(120_000);
      const db = database();
      const prefix = `visibility-${randomUUID()}`;
      const createdName = `ZZZ ${prefix}`;
      const initialSearch = table === "vendor" ? prefix : `A ${prefix}`;
      for (let index = 0; index < 12; index++) {
        const id = `${prefix}-${index}`;
        const name = `A ${prefix} ${index}`;
        if (table === "unit") {
          db.prepare('INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt) VALUES (?,?,?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
            .run(id, name, name.toLowerCase(), id, id);
        } else {
          db.prepare(`INSERT INTO ${table} (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES (?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
            .run(id, name, name.toLowerCase());
        }
      }
      try {
        await page.setViewportSize({ width, height: 900 });
        await signIn(page);
        await page.goto(`/master-data?tab=${tab}&search=${encodeURIComponent(initialSearch)}&page=2`);
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        await expect(page.getByText("Showing 11 to 12 of 12 results", { exact: true })).toBeVisible();
        await page.locator(`#new-${table}`).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(createdName);
        if (table === "unit") await dialog.getByRole("textbox", { name: "Abbreviation", exact: true }).fill(prefix.slice(-12));
        await dialog.getByRole("button", { name: `Create ${singular}`, exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(page.locator(`#${table}-search`)).toHaveValue(table === "vendor" ? initialSearch : "");
        await expect(page.getByText(createdName, { exact: true }).filter({ visible: true })).toBeVisible();
        await expect(page.getByText(createdName, { exact: true }).filter({ visible: true })).toBeInViewport();
        await expect(page.getByText(createdName, { exact: true }).filter({ visible: true })).toBeFocused();
        // Wait for the creation's canonical URL, not just its local list state,
        // before reloading. The browser URL update can follow the React commit.
        await expect(page).toHaveURL((url) =>
          url.searchParams.get("tab") === tab &&
          (url.searchParams.get("search") ?? "") === (table === "vendor" ? initialSearch : "") &&
          Number(url.searchParams.get("page")) > 1,
        );
        await page.reload();
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        await expect(page.getByText(createdName, { exact: true }).filter({ visible: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`created-${table}-${width}.png`), fullPage: true });
      } finally {
        db.prepare(`DELETE FROM ${table} WHERE id LIKE ? OR name = ?`).run(`${prefix}%`, createdName);
        db.close();
      }
    });
  }
}
