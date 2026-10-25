import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const prefix = `PO-AMOUNTS-${randomUUID()}`;
const cases = [
  { key: "empty", receipts: [], label: "₱ 0.00" },
  { key: "complete", receipts: [["1000.10", "0.20"], ["200"]], label: "₱ 1,200.30" },
  { key: "partial", receipts: [["50"], [null]], label: "Amount incomplete" },
  { key: "unpriced", receipts: [[null]], label: "Not recorded" },
  { key: "large", receipts: [["9007199254740993.305"]], label: "₱ 9,007,199,254,740,993.305" },
] satisfies { key: string; receipts: (string | null)[][]; label: string }[];

function openDatabase() {
  const path = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!path) throw new Error("Isolated E2E database required");
  return new Database(path);
}

test.beforeAll(() => {
  const db = openDatabase();
  try {
    db.prepare('INSERT INTO recipe (id,name,normalizedName,preparationNote,isActive,createdAt,updatedAt) VALUES (?,?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
      .run(prefix, prefix, prefix.toLowerCase(), "Prepare ingredients before cooking.");
    db.prepare('INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES (?,?,?,?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
      .run(prefix, prefix, prefix.toLowerCase(), "default-category-staples-dry-goods", "default-unit-kilogram", "10");
    for (const scenario of cases) {
      const id = `${prefix}-${scenario.key}`;
      db.prepare('INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,referenceNumber,note,createdAt,updatedAt) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
        .run(id, id, id.toLowerCase(), "e2e-vendor-acme", `REF-${scenario.key}`, "Amount summary fixture");
      scenario.receipts.forEach((amounts, receiptIndex) => {
        const receiptId = `${id}-${receiptIndex}`;
        db.prepare('INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)')
          .run(receiptId, id, "e2e-vendor-acme", "Acme Foods", id, receiptId, receiptId.toLowerCase(), "2026-10-25T00:00:00.000Z");
        amounts.forEach((amount, lineIndex) => {
          const lineId = `${receiptId}-${lineIndex}`;
          db.prepare('INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
            .run(lineId, receiptId, prefix, "default-unit-kilogram", "default-unit-kilogram", prefix, "Kilogram", "Kilogram", "1", "1", "1", amount, amount);
          db.prepare('INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)')
            .run(lineId, lineId, prefix, "default-unit-kilogram", "1", "stock-in");
        });
      });
    }
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = openDatabase();
  try {
    db.prepare("DELETE FROM inventory_ledger_movement WHERE itemId = ?").run(prefix);
    db.prepare("DELETE FROM delivery_receipt_line WHERE itemId = ?").run(prefix);
    db.prepare("DELETE FROM delivery_receipt WHERE purchaseOrderId LIKE ?").run(`${prefix}%`);
    db.prepare("DELETE FROM purchase_order WHERE id LIKE ?").run(`${prefix}%`);
    db.prepare("DELETE FROM item WHERE id = ?").run(prefix);
    db.prepare("DELETE FROM recipe WHERE id = ?").run(prefix);
  } finally { db.close(); }
});

for (const width of [1280, 320]) {
  test(`shows matching delivered amounts and receipt counts on PO list and detail at ${width}px`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    const signedIn = await page.request.post("/api/auth/sign-in/username", {
      data: { username: "municipal.admin", password: "administrator-password" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    });
    expect(signedIn.status()).toBe(200);
    const listUrl = `/purchase-orders?purchaseOrdersSearch=${prefix}`;
    await page.goto(listUrl);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    if (width >= 640) {
      await expect(page.getByRole("columnheader", { name: "Total delivered", exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Reference", exact: true })).toHaveCount(0);
    }
    await page.screenshot({ path: info.outputPath(`po-amounts-list-${width}.png`), fullPage: true });
    for (const scenario of cases) {
      const id = `${prefix}-${scenario.key}`;
      const row = page.locator(`[data-purchase-order-id="${id}"]`).filter({ visible: true });
      await expect(row.getByText(scenario.label, { exact: true })).toBeVisible();
      await expect(row.getByText(`REF-${scenario.key}`, { exact: true })).toHaveCount(0);
      await row.getByRole("link", { name: id, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/purchase-orders/${id}$`));
      await expect(page.getByRole("heading", { name: id, exact: true })).toBeVisible();
      await expect(page.locator('[data-po-total-delivered]')).toHaveText(scenario.label);
      await expect(page.locator('[data-po-receipt-count]')).toHaveText(String(scenario.receipts.length));
      await expect(page.getByText("Document context", { exact: true })).toHaveCount(0);
      const details = page.getByRole("button", { name: "Purchase Order details", exact: true });
      await expect(details).toHaveAttribute("aria-expanded", "false");
      await expect(details).toBeEnabled();
      await expect(page.getByText(`REF-${scenario.key}`, { exact: true })).not.toBeVisible();
      await details.focus();
      await page.keyboard.press("Enter");
      await expect(details).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByText(`REF-${scenario.key}`, { exact: true })).toBeVisible();
      await expect(page.getByText("Amount summary fixture", { exact: true })).toBeVisible();
      await details.click();
      await expect(details).toHaveAttribute("aria-expanded", "false");
      if (scenario.receipts.length) {
        await expect(page.locator('[data-delivery-history-total]')).toHaveText(scenario.label);
        await expect(page.locator('[data-receipt-amount]')).toHaveCount(scenario.receipts.length);
        if (scenario.key === "complete") {
          await expect(page.locator('[data-receipt-amount]')).toHaveText(["₱ 1,000.30", "₱ 200.00"]);
        }
        if (scenario.key === "partial") {
          await expect(page.locator('[data-receipt-amount]')).toHaveText(["₱ 50.00", "Not recorded"]);
        }
      }
      await page.screenshot({ path: info.outputPath(`po-amounts-${scenario.key}-${width}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.goto(listUrl);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    }
    // Reference remains searchable even though its display column was replaced.
    await page.getByRole("searchbox", { name: "Search Purchase Orders", exact: true }).fill("REF-complete");
    const complete = page.locator(`[data-purchase-order-id="${prefix}-complete"]`).filter({ visible: true });
    await expect(complete).toBeVisible();
    await expect(complete).toContainText("₱ 1,200.30");
    await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(`/recipes/${prefix}`);
    await expect(page.getByRole("heading", { name: prefix, exact: true })).toBeVisible();
    const note = page.getByRole("button", { name: "Preparation note", exact: true });
    await expect(note).toHaveAttribute("aria-expanded", "false");
    await expect(note).toBeEnabled();
    await expect(page.getByText("Prepare ingredients before cooking.", { exact: true })).not.toBeVisible();
    await note.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Prepare ingredients before cooking.", { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`recipe-details-${width}.png`), fullPage: true });
    await note.click();
    await expect(note).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
