import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("Purchase Order controls wait for hydration before accepting an interaction", async ({ page }, testInfo) => {
  const id = randomUUID();
  const name = `Hydration PO ${id}`;
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  database.prepare("INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id, name, name.toLowerCase(), "e2e-vendor-acme");
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => { release = resolve; });
  try {
    expect((await page.request.post("/api/auth/sign-in/username", {
      data: { username: "municipal.admin", password: "administrator-password" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    })).status()).toBe(200);
    await page.route("**/_next/**/*.js", async (route) => { await scripts; await route.continue(); });
    try {
      await page.goto(`/purchase-orders?purchaseOrdersSearch=${encodeURIComponent(name)}`, { waitUntil: "commit" });
      await expect(page.getByRole("button", { name: "Create Purchase Order", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: `Actions for ${name}`, exact: true })).toBeDisabled();
      await expect(page.getByLabel("Search Purchase Orders", { exact: true })).toBeDisabled();
    } finally { release(); }
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.getByRole("button", { name: `Actions for ${name}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    const create = page.getByRole("button", { name: "Create Purchase Order", exact: true });
    await expect(create).toBeEnabled();
    await create.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Create Purchase Order", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath("purchase-orders-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath("purchase-orders-mobile.png"), fullPage: true });
  } finally {
    database.prepare("DELETE FROM purchase_order WHERE id=?").run(id);
    database.close();
  }
});

