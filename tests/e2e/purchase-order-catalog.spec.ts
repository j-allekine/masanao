import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const id = `po-catalog-${randomUUID()}`;
const retryNumber = `PO-RETRY-${id}`;
const number = `PO-${"長".repeat(97)}`;
const vendorName = "Municipal kitchen supplier ".repeat(8).slice(0, 200);
function db() { return new Database(process.env.MASANAO_E2E_DATABASE_PATH!); }
test.beforeAll(() => {
  const database = db();
  try {
    database.prepare('INSERT INTO vendor (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES (?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').run(id, vendorName, id);
    database.prepare('INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)').run(id, number, number.toLowerCase(), id);
  } finally { database.close(); }
});
test.afterAll(() => {
  const database = db();
  try {
    database.prepare('DELETE FROM purchase_order WHERE id=? OR purchaseOrderNo=?').run(id, retryNumber);
    database.prepare('DELETE FROM vendor WHERE id=?').run(id);
  } finally { database.close(); }
});
for (const role of ["admin", "staff"]) {
  test(`long Purchase Order facts, menus and responsive state for ${role}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const signedIn = await page.request.post("/api/auth/sign-in/username", {
      data: { username: role === "admin" ? "municipal.admin" : "kitchen.staff", password: role === "admin" ? "administrator-password" : "correct-horse-battery-staple" },
      headers: { origin: process.env.BETTER_AUTH_URL! },
    });
    expect(signedIn.status()).toBe(200);
    await page.goto(`/purchase-orders?purchaseOrdersSearch=${encodeURIComponent(number)}`);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const row = page.locator(`[data-purchase-order-id="${id}"]`);
    for (const width of [1280, 1024, 320]) {
      await page.setViewportSize({ width, height: 600 });
      await expect(row).toHaveCount(1);
      await expect(row.getByRole("link", { name: number, exact: true })).toBeVisible();
      await expect(row.getByText(vendorName, { exact: true })).toBeVisible();
      await expect(row.getByText("₱ 0.00", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`po-${role}-${width}.png`), fullPage: true });
    }
    if (role === "staff") {
      await expect(row.getByRole("button")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Create Purchase Order", exact: true })).toHaveCount(0);
      await row.getByRole("link", { name: number, exact: true }).click();
      await expect(page.getByRole("link", { name: "Record delivery", exact: true })).toBeVisible();
      return;
    }
    const trigger = row.getByRole("button", { name: `Actions for ${number}`, exact: true });
    await trigger.click();
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit Purchase Order", exact: true });
    await page.setViewportSize({ width: 320, height: 480 });
    await expect(dialog.getByRole("textbox", { name: "Purchase Order No.", exact: true })).toHaveValue(number);
    await dialog.getByRole("textbox", { name: "Purchase Order No.", exact: true }).fill("");
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(dialog.getByRole("textbox", { name: "Purchase Order No.", exact: true })).toBeFocused();
    await page.screenshot({ path: info.outputPath("po-edit-invalid-short.png") });
    await page.keyboard.press("Escape");
    await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deletion = page.getByRole("alertdialog", { name: `Delete “${number}”?`, exact: true });
    await expect(deletion).toBeFocused();
    expect(await deletion.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.top >= 15 && box.bottom <= innerHeight - 15 && box.left >= 15 && box.right <= innerWidth - 15 && element.scrollWidth <= element.clientWidth;
    })).toBe(true);
    await page.screenshot({ path: info.outputPath("po-delete-long-short.png") });
    await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(trigger).toBeFocused();
    await page.getByRole("button", { name: "Create Purchase Order", exact: true }).click();
    const create = page.getByRole("dialog", { name: "Create Purchase Order", exact: true });
    await create.getByRole("textbox", { name: "Purchase Order No.", exact: true }).fill(retryNumber);
    await create.getByRole("combobox", { name: "Vendor", exact: true }).click();
    await page.getByRole("option", { name: "Acme Foods", exact: true }).click();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/purchase-orders*", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await pending;
      await route.abort("failed");
    });
    try {
      await create.getByRole("button", { name: "Create Purchase Order", exact: true }).click();
      await expect(create.getByRole("button", { name: /Saving/ })).toBeDisabled();
      await page.keyboard.press("Escape");
      await create.getByRole("button", { name: "Close", exact: true }).click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(create).toBeVisible();
    } finally { release(); }
    await expect(create.getByText("Could not save Purchase Order", { exact: true })).toBeVisible();
    await expect(create.getByRole("textbox", { name: "Purchase Order No.", exact: true })).toHaveValue(retryNumber);
    await page.screenshot({ path: info.outputPath("po-create-failed-short.png") });
    await page.unroute("**/purchase-orders*");
    await create.getByRole("button", { name: "Create Purchase Order", exact: true }).click();
    await expect(create).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Actions for ${retryNumber}`, exact: true })).toBeFocused();

  });
}
