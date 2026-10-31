import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const id = `po-record-${randomUUID()}`;
const number = `PO-${"長".repeat(97)}`;
const vendorName = "Municipal kitchen supplier ".repeat(8).slice(0, 200);
const receiptNo = `DR-${"長".repeat(97)}`;
function db() { return new Database(process.env.MASANAO_E2E_DATABASE_PATH!); }
test.beforeAll(() => {
  const database = db();
  try {
    database.prepare('INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES (?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').run(id, vendorName, id);
    database.prepare('INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').run(id, number, number.toLowerCase(), id);
    database.prepare('INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,?,?,?,?,?,?,?,?)').run(id, id, id, vendorName, number, receiptNo, receiptNo.toLowerCase(), "2026-10-25T00:00:00.000Z", "2026-10-26T00:00:00.000Z");
    database.prepare('INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, id, "e2e-recipe-item-rice", "default-unit-kilogram", "default-unit-kilogram", "Rice ".repeat(40), "Kilogram", "Kilogram", "1.5", "1", "1.5", "9007199254740993.305", "13510798882111489.9575");
  } finally { database.close(); }
});
test.afterAll(() => {
  const database = db();
  try {
    database.prepare('DELETE FROM delivery_receipt_line WHERE id=?').run(id);
    database.prepare('DELETE FROM delivery_receipt WHERE id=?').run(id);
    database.prepare('DELETE FROM purchase_order WHERE id=?').run(id);
    database.prepare('DELETE FROM vendor WHERE id=?').run(id);
  } finally { database.close(); }
});

for (const role of ["admin", "staff"]) test(`PO record, inspection and latest catalog return for ${role}`, async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: role === "admin" ? "municipal.admin" : "kitchen.staff", password: role === "admin" ? "administrator-password" : "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  await page.goto("/purchase-orders");
  await page.getByRole("searchbox", { name: "Search Purchase Orders", exact: true }).fill(number);
  const link = page.getByRole("link", { name: number, exact: true });
  await expect(link).toHaveAttribute("href", new RegExp("purchaseOrdersReturn="));
  await link.click();
  await expect(page.getByRole("heading", { name: number, exact: true })).toBeVisible({ timeout: 30_000 });
  await page.addStyleTag({ content: "nextjs-portal { display:none!important }" });
  for (const width of [1280, 1024, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 480 : 600 });
    await expect(page.locator("[data-po-total-delivered]")).toHaveText("₱ 13,510,798,882,111,489.9575");
    await expect(page.getByText(vendorName, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const inspect = page.getByRole("button", { name: receiptNo, exact: true });
    await expect(inspect).toBeVisible();
    await expect(page.getByText("Oct 25, 2026", { exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`po-record-${role}-${width}.png`), fullPage: true });
    await inspect.click();
    const dialog = page.getByRole("dialog", { name: `Delivery receipt ${receiptNo}`, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Lines", { exact: true })).toBeVisible();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (width === 320) await expect(dialog.locator("tbody tr")).toHaveCSS("display", "grid");
    await page.screenshot({ path: info.outputPath(`receipt-${role}-${width}.png`), fullPage: true });
    await dialog.getByRole("button", { name: "Close", exact: true }).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`receipt-actions-${role}-${width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(inspect).toBeFocused();
  }
  const edit = page.getByRole("button", { name: "Edit", exact: true });
  if (role === "admin") {
    await edit.click();
    const dialog = page.getByRole("dialog", { name: "Edit Purchase Order", exact: true });
    await expect(dialog.getByRole("combobox", { name: "Vendor", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(edit).toBeFocused();
  } else await expect(edit).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Actions for ${number}`, exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Record delivery", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Record delivery", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const catalog = page.getByRole("navigation", { name: "breadcrumb" }).getByRole("link", { name: "Purchase Orders", exact: true });
  await expect(catalog).toHaveAttribute("href", `/purchase-orders?purchaseOrdersSearch=${encodeURIComponent(number)}`);
  await catalog.click();
  await expect(page.getByRole("searchbox", { name: "Search Purchase Orders", exact: true })).toHaveValue(number);
});

