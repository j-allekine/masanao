import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    const insert = db.prepare(`INSERT INTO item
      (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt)
      VALUES (?, ?, ?, 'default-category-staples-dry-goods', 'default-unit-kilogram', '2.5', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
    insert.run("search-251-brown", "Brown Rice", "brown rice", 1);
    insert.run("search-251-white", "White Rice", "white rice", 1);
    insert.run("search-251-inactive", "Retired Brown Rice", "retired brown rice", 0);
    db.exec(`
      INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt)
      VALUES ('search-251-vendor','Search Vendor','search vendor',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt)
      VALUES ('search-251-po','SEARCH-251','search-251','search-251-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate)
      VALUES ('search-251-receipt','search-251-po','search-251-vendor','Search Vendor','SEARCH-251','SEARCH-251-DR','search-251-dr',CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity)
      VALUES ('search-251-line','search-251-receipt','search-251-brown','default-unit-kilogram','default-unit-kilogram','Brown Rice','Kilogram','Kilogram','2.500000000000000001','1','2.500000000000000001');
      INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt)
      VALUES ('search-251-stock','search-251-line','search-251-brown','default-unit-kilogram','2.500000000000000001','stock-in',CURRENT_TIMESTAMP);
    `);
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("DELETE FROM inventory_ledger_movement WHERE id='search-251-stock'").run();
    for (const table of ["delivery_receipt_line", "delivery_receipt", "purchase_order", "vendor"]) {
      db.prepare(`DELETE FROM ${table} WHERE id LIKE 'search-251-%'`).run();
    }
    db.prepare("DELETE FROM item WHERE id LIKE 'search-251-%'").run();
  } finally { db.close(); }
});

for (const width of [1280, 320]) {
  test(`manual Refresh stays pending until its changed snapshot arrives at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    expect((await page.request.post("/api/auth/sign-in/username", {
      data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    const isInventoryResponse = (response: import("@playwright/test").Response) => response.request().headers()["rsc"] === "1" && new URL(response.url()).pathname === "/inventory";
    const entryResponse = page.waitForResponse(isInventoryResponse);
    await page.goto("/inventory?q=Brown");
    await (await entryResponse).finished();
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    const refresh = page.getByRole("button", { name: "Refresh", exact: true });
    await expect(refresh).toBeEnabled();
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
    let markRequested!: () => void;
    const refreshRequested = new Promise<void>((resolve) => { markRequested = resolve; });
    await page.route("**/inventory?**", async (route) => {
      if (route.request().headers()["rsc"] === "1") { markRequested(); await refreshGate; }
      await route.continue();
    });
    const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    try {
      await refresh.click();
      await refreshRequested;
      const pending = page.getByRole("button", { name: "Refreshing…", exact: true });
      await expect(pending).toBeDisabled();
      await expect(pending).toHaveAttribute("aria-busy", "true");
      db.prepare("UPDATE item SET reorderLevel='3' WHERE id='search-251-brown'").run();
      const response = page.waitForResponse(isInventoryResponse);
      releaseRefresh();
      await (await response).finished();
      const list = page.locator(width === 320 ? '[data-inventory-mobile]' : '[data-inventory-desktop]');
      await expect(list.locator('[data-item-id="search-251-brown"]')).toContainText("Reorder now");
      await expect(refresh).toBeEnabled();
      await expect(page.getByRole("searchbox", { name: "Search Inventory by Item name", exact: true })).toHaveValue("Brown");
      await expect(page).toHaveURL(/\/inventory\?q=Brown$/);
      await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toHaveAttribute("href", "/inventory/export?q=Brown");
    } finally {
      releaseRefresh();
      db.prepare("UPDATE item SET reorderLevel='2.5' WHERE id='search-251-brown'").run();
      db.close();
    }
  });

  test(`Inventory controls wait for hydration at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    let releaseScripts!: () => void;
    const scriptsGate = new Promise<void>((resolve) => { releaseScripts = resolve; });
    await page.route("**/_next/static/**/*.js*", async (route) => { await scriptsGate; await route.continue(); });
    try {
      expect((await page.request.post("/api/auth/sign-in/username", {
        data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
        headers: { origin: process.env.BETTER_AUTH_URL! },
      })).status()).toBe(200);
      await page.goto("/inventory", { waitUntil: "commit" });
      await expect(page.locator('[data-inventory-ready="false"]')).toBeAttached();
      await expect(page.getByRole("searchbox", { includeHidden: true })).toBeDisabled();
      await expect(page.getByRole("combobox", { includeHidden: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Good", exact: true, includeHidden: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Refresh", exact: true, includeHidden: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Export CSV", exact: true, includeHidden: true })).toBeDisabled();
    } finally { releaseScripts(); }
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Search Inventory by Item name", exact: true });
    await expect(search).toBeEnabled();
    await search.pressSequentially("Brown");
    await expect(search).toHaveValue("Brown");
    await expect(page.getByText("White Rice", { exact: true })).toHaveCount(0);
  });

  test(`sidebar re-entry refreshes a cached stock snapshot at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    expect((await page.request.post("/api/auth/sign-in/username", {
      data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    try {
      await page.goto("/inventory");
      await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
      const list = page.locator(width === 320 ? '[data-inventory-mobile]' : '[data-inventory-desktop]');
      const brown = list.locator('[data-item-id="search-251-brown"]');
      await expect(brown).toContainText("Good");
      if (width === 320) await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).first().click();
      await page.getByRole("link", { name: "Purchase Orders", exact: true }).click();
      await expect(page).toHaveURL(/\/purchase-orders$/);
      if (width === 320) await page.keyboard.press("Escape");
      db.prepare("UPDATE item SET reorderLevel='3' WHERE id='search-251-brown'").run();
      if (width === 320) await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).first().click();
      await page.getByRole("link", { name: "Inventory", exact: true }).click();
      await expect(page).toHaveURL(/\/inventory$/);
      if (width === 320) await page.keyboard.press("Escape");
      await expect(brown).toContainText("Reorder now");
      await expect(brown).toContainText("3 kg");
    } finally {
      db.prepare("UPDATE item SET reorderLevel='2.5' WHERE id='search-251-brown'").run();
      db.close();
    }
  });

  test(`sidebar Inventory entry clears the previous query at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    expect((await page.request.post("/api/auth/sign-in/username", {
      data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    await page.goto("/inventory");
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
    const search = page.getByRole("searchbox", { name: "Search Inventory by Item name", exact: true });
    await search.pressSequentially("Brown");
    await expect(search).toHaveValue("Brown");
    await expect(page.getByText("White Rice", { exact: true })).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("Brown");
    if (width === 320) await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).first().click();
    await page.getByRole("link", { name: "Inventory", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory$/);
    if (width === 320) await page.keyboard.press("Escape");
    await expect(search).toHaveValue("");
    const list = page.locator(width === 320 ? '[data-inventory-mobile]' : '[data-inventory-desktop]');
    await expect(list.getByText("White Rice", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toHaveAttribute("href", "/inventory/export");
  });

  test(`typing remains intact while entry refresh is pending at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    expect((await page.request.post("/api/auth/sign-in/username", {
      data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => { releaseRefresh = resolve; });
    let markRequested!: () => void;
    const refreshRequested = new Promise<void>((resolve) => { markRequested = resolve; });
    let held = false;
    const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    await page.route("**/inventory?**", async (route) => {
      if (route.request().headers()["rsc"] === "1") {
        if (!held) { held = true; markRequested(); }
        await refreshGate;
      }
      await route.continue();
    });
    try {
      await page.goto("/inventory");
      await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
      await refreshRequested;
      const search = page.getByRole("searchbox", { name: "Search Inventory by Item name", exact: true });
      await search.focus();
      await search.pressSequentially("  bRoWn  ");
      await expect(search).toBeFocused();
      await expect(search).toHaveValue("  bRoWn  ");
      await search.pressSequentially("x");
      await expect(search).toHaveValue("  bRoWn  x");
      await search.press("Backspace");
      await expect(search).toHaveValue("  bRoWn  ");
      await expect(page.getByText("White Rice", { exact: true })).toHaveCount(0);
      db.prepare("UPDATE item SET reorderLevel='3' WHERE id='search-251-brown'").run();
      const refreshed = page.waitForResponse((response) => response.request().headers()["rsc"] === "1" && new URL(response.url()).pathname === "/inventory");
      releaseRefresh();
      await (await refreshed).finished();
      const list = page.locator(width === 320 ? '[data-inventory-mobile]' : '[data-inventory-desktop]');
      await expect(list.locator('[data-item-id="search-251-brown"]')).toContainText("Reorder now");
      await expect(search).toHaveValue("  bRoWn  ");
      await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("  bRoWn  ");
      const exportHref = await page.getByRole("button", { name: "Export CSV", exact: true }).getAttribute("href");
      expect(new URL(exportHref!, page.url()).searchParams.get("q")).toBe("  bRoWn  ");
      await expect(page.getByText("White Rice", { exact: true })).toHaveCount(0);
      await expect(list.getByText("Brown Rice", { exact: true })).toBeVisible();
    } finally {
      releaseRefresh();
      db.prepare("UPDATE item SET reorderLevel='2.5' WHERE id='search-251-brown'").run();
      db.close();
    }
  });

  test(`name search preserves stock and offers keyboard clearing at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 800 });
    expect((await page.request.post("/api/auth/sign-in/username", {
      data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    await page.goto("/inventory");
    await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Search Inventory by Item name", exact: true });
    const list = page.locator(width === 320 ? '[data-inventory-mobile]' : '[data-inventory-desktop]');
    const brown = width === 320
      ? page.locator('[data-inventory-mobile] [data-item-id="search-251-brown"]')
      : page.getByRole("row").filter({ hasText: "Brown Rice" });
    await expect(brown).toContainText("2.500000000000000001 kg");
    await expect(brown).toContainText("Good");
    await search.focus();
    await search.pressSequentially("  bRoWn  ");
    await expect(brown).toBeVisible();
    await expect(brown).toContainText("2.500000000000000001 kg");
    await expect(brown).toContainText("Good");
    await expect(page.getByText("White Rice", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Retired Brown Rice", { exact: true })).toHaveCount(0);
    const evidence = process.env.MASANAO_INVENTORY_EVIDENCE_DIR;
    if (evidence) mkdirSync(evidence, { recursive: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: evidence ? join(evidence, `inventory-search-matched-${width}.png`) : testInfo.outputPath(`matched-${width}.png`), fullPage: true });
    await search.press("Tab");
    await expect(page.getByRole("button", { name: "Clear search", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(search).toHaveValue("");
    await expect(list.getByText("White Rice", { exact: true })).toBeVisible();
    // Category text must not act as an Item-name match.
    await search.fill("Staples & Dry Goods");
    await expect(page.getByText("No matching Items.", { exact: true })).toBeVisible();
    await expect(page.getByText("Try changing or clearing the filters.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: evidence ? join(evidence, `inventory-search-no-match-${width}.png`) : testInfo.outputPath(`no-match-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Clear search", exact: true }).last().click();
    await expect(search).toHaveValue("");
    await expect(brown).toBeVisible();
    await search.fill("  ");
    await expect(brown).toBeVisible();
    await expect(list.getByText("White Rice", { exact: true })).toBeVisible();
    await page.screenshot({ path: evidence ? join(evidence, `inventory-search-${width}.png`) : testInfo.outputPath(`search-${width}.png`), fullPage: true });
  });
}

