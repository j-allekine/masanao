import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const prefix = `receipt-history-${randomUUID()}`;
const counts = [0, 1, 10, 11, 24];
const orderId = (count: number) => `${prefix}-${count}`;
const receiptId = (count: number, index: number) => `${orderId(count)}-${String(index).padStart(2, "0")}`;
function database() { return new Database(process.env.MASANAO_E2E_DATABASE_PATH!); }
test.beforeAll(() => {
  const db = database();
  try {
    for (const count of [...counts, 25]) {
      const id = orderId(count);
      db.prepare('INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES (?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').run(id, id, id);
      db.prepare('INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').run(id, id, id, id);
      for (let index = 0; index < count; index++) {
        const receipt = receiptId(count, index);
        db.prepare('INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,?,?,?,?,?,?,?,?)').run(receipt, id, id, "Acme Foods", id, `DR-${String(index).padStart(2, "0")}`, `dr-${String(index).padStart(2, "0")}`, "2026-10-25T00:00:00.000Z", "2026-10-26T00:00:00.000Z");
        db.prepare('INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(receipt, receipt, "e2e-recipe-item-rice", "default-unit-kilogram", "default-unit-kilogram", "Rice", "Kilogram", "Kilogram", "1", "1", "1", index === 0 ? null : "0.10", index === 0 ? null : "0.10");
      }
    }
  } finally { db.close(); }
});

test.afterAll(() => {
  const db = database();
  try {
    db.prepare('DELETE FROM delivery_receipt_line WHERE deliveryReceiptId LIKE ?').run(`${prefix}%`);
    db.prepare('DELETE FROM delivery_receipt WHERE purchaseOrderId LIKE ?').run(`${prefix}%`);
    db.prepare('DELETE FROM purchase_order WHERE id LIKE ?').run(`${prefix}%`);
    db.prepare('DELETE FROM vendor WHERE id LIKE ?').run(`${prefix}%`);
  } finally { db.close(); }
});

for (const role of ["admin", "staff"]) test(`complete receipt search, paging and independent return for ${role}`, async ({ page }, info) => {
  test.setTimeout(150_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: role === "admin" ? "municipal.admin" : "kitchen.staff", password: role === "admin" ? "administrator-password" : "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  for (const count of counts) {
    await page.goto(`/purchase-orders/${orderId(count)}`);
    await expect(page.locator("[data-po-receipt-count]")).toHaveText(String(count));
    await expect(page.locator("[data-receipt-amount]")).toHaveCount(Math.min(10, count));
    await expect(page.getByRole("searchbox", { name: "Search receipt numbers" })).toHaveCount(count > 10 ? 1 : 0);
    if (!count) await expect(page.getByText("No Delivery Receipts yet.", { exact: true })).toBeVisible();
  }
  const url = `/purchase-orders/${orderId(24)}?receiptPage=2&purchaseOrdersReturn=${encodeURIComponent("/purchase-orders?purchaseOrdersSearch=Acme&purchaseOrdersPage=2")}`;
  await page.goto(url);
  const search = page.getByRole("searchbox", { name: "Search receipt numbers" });
  await expect(page.getByText("Showing 11 to 20 of 24 results", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "DR-13", exact: true })).toBeVisible();
  await expect(page.locator("[data-po-total-delivered]")).toHaveText("Amount incomplete");
  await expect(search).toBeEditable();
  await search.fill("DR-00");
  const inspect = page.getByRole("button", { name: "DR-00", exact: true });
  await expect(inspect).toBeVisible();
  await expect(page.getByRole("heading", { name: "Delivery Receipt history (24)", exact: true })).toBeVisible();
  await expect(page.locator("[data-delivery-history-total]")).toHaveText("Amount incomplete");
  await inspect.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(inspect).toBeFocused();
  await search.fill("none");
  await expect(page.getByText("No matching receipts", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear receipt search", exact: true }).first().click();
  await expect(page.getByText("Showing 1 to 10 of 24 results", { exact: true })).toBeVisible();
  await search.fill("DR-01");
  await page.getByRole("link", { name: "Record delivery", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Record delivery", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(search).toHaveValue("DR-01");
  await page.reload(); await expect(search).toHaveValue("DR-01");
  await page.goBack(); await expect(page.getByRole("dialog", { name: "Record delivery", exact: true })).toBeVisible();
  await page.goForward(); await expect(search).toHaveValue("DR-01");
  await page.goto(`/purchase-orders/${orderId(24)}?receiptPage=99`);
  await expect(page.getByText("Showing 21 to 24 of 24 results", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/receiptPage=3/);
  // A newly posted identity is revealed at its actual stable tied-timestamp position.
  await page.goto(`/purchase-orders/${orderId(24)}?receiptSearch=DR-23&receiptCreated=${receiptId(24, 0)}`);
  await expect(search).toHaveValue("");
  await expect(page.getByRole("button", { name: "DR-00", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/receiptPage=3/);
  await expect(page.getByRole("button", { name: "DR-00", exact: true })).toBeFocused();
  await expect(page.getByText("Receipt search cleared to show the new delivery.", { exact: true })).toBeVisible();
  for (const width of [1024, 320]) {
    await page.setViewportSize({ width, height: 480 });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`history-${role}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "DR-00", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: info.outputPath(`inspection-${role}-${width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
  }
});


test("delayed receipt refresh and authoritative shrink retain owned state", async ({ page }) => {
  test.setTimeout(90_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  const future = `${orderId(25)}-future`;
  await page.goto(`/purchase-orders/${orderId(25)}?receiptSearch=DR-00&receiptCreated=${future}`);
  const search = page.getByRole("searchbox", { name: "Search receipt numbers" });
  await expect(search).toBeEditable();
  await expect(page).toHaveURL(/receiptCreated=/);
  const db = database();
  try {
    db.prepare('INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES (?,?,?,?,?,?,?,?,?)').run(future, orderId(25), orderId(25), "Acme Foods", orderId(25), "New arrival", "new arrival", "2026-10-25T00:00:00.000Z", "2026-10-27T00:00:00.000Z");
    db.prepare('INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(future, future, "e2e-recipe-item-rice", "default-unit-kilogram", "default-unit-kilogram", "Rice", "Kilogram", "Kilogram", "1", "1", "1", "0.10", "0.10");
  } finally { db.close(); }
  await page.reload();
  await expect(page.getByRole("button", { name: "New arrival", exact: true })).toBeVisible();
  await expect(search).toHaveValue("");
  await expect(page).not.toHaveURL(/receiptCreated=/);
  await page.goto(`/purchase-orders/${orderId(25)}?receiptSearch=DR&receiptPage=3`);
  await expect(page.getByText("Showing 21 to 25 of 25 results", { exact: true })).toBeVisible();
  const shrink = database();
  try {
    for (let index = 0; index < 20; index++) {
      shrink.prepare('DELETE FROM delivery_receipt_line WHERE deliveryReceiptId=?').run(receiptId(25, index));
      shrink.prepare('DELETE FROM delivery_receipt WHERE id=?').run(receiptId(25, index));
    }
  } finally { shrink.close(); }
  await page.reload();
  await expect(search).toHaveValue("DR");
  await expect(page.getByRole("button", { name: "Clear receipt search", exact: true })).toBeVisible();
  await expect(page.getByText("Showing 1 to 5 of 5 results", { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/receiptPage=/);
});
