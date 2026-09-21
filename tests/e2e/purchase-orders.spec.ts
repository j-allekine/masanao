import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";
const adminPassword = "administrator-password";

async function signIn(
  page: Page,
  username = "kitchen.staff",
  password = staffPassword,
) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username,
      password,
    },
    headers: {
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3019",
    },
  });

  expect(response.status()).toBe(200);
}

function withE2eDatabase<T>(callback: (database: Database.Database) => T): T {
  const databasePath = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!databasePath) throw new Error("MASANAO_E2E_DATABASE_PATH is not set");

  const database = new Database(databasePath);
  try {
    return callback(database);
  } finally {
    database.close();
  }
}

test.describe("Purchase Orders read journey", () => {
  test("lets staff open the responsive catalog and retain Vendor context", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const purchaseOrderIds = Array.from({ length: 11 }, () => randomUUID());
    const vendorId = "e2e-vendor-acme";

    await signIn(page);
    await page.goto("/purchase-orders");
    await expect(page.getByRole("heading", { name: "Purchase Orders", exact: true })).toBeVisible();
    await expect(page.getByText("No Purchase Orders yet.", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Purchase Orders", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    try {
      withE2eDatabase((database) => {
        const insertPurchaseOrder = database.prepare(
          `INSERT INTO "purchase_order"
           ("id", "purchaseOrderNo", "normalizedPurchaseOrderNo", "vendorId", "referenceNumber", "note", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        );

        purchaseOrderIds.forEach((purchaseOrderId, index) => {
          const purchaseOrderNo = `PO-E2E-${String(index + 1).padStart(3, "0")}`;
          insertPurchaseOrder.run(
            purchaseOrderId,
            purchaseOrderNo,
            purchaseOrderNo.toLowerCase(),
            vendorId,
            `ORS-E2E-${String(index + 1).padStart(3, "0")}`,
            index === 0 ? "Kitchen delivery" : null,
          );
        });
      });

      await page.reload();
      const desktopTable = page.locator("[data-purchase-orders-table-desktop]");
      const populatedRow = desktopTable
        .locator("[data-purchase-order-id]")
        .filter({ hasText: "PO-E2E-001" });
      await expect(
        populatedRow.getByText("PO-E2E-001", { exact: true }),
      ).toBeVisible();
      await expect(
        populatedRow.getByText("Acme Foods", { exact: true }),
      ).toBeVisible();
      await expect(
        populatedRow.getByText("ORS-E2E-001", { exact: true }),
      ).toBeVisible();
      const purchaseOrderLink = populatedRow.getByRole("link", {
        name: "PO-E2E-001",
        exact: true,
      });
      await expect(purchaseOrderLink).toBeVisible();
      await expect(purchaseOrderLink).toHaveAttribute(
        "href",
        `/purchase-orders/${purchaseOrderIds[0]}`,
      );
      await purchaseOrderLink.focus();
      await expect(purchaseOrderLink).toBeFocused();
      await page.goto(`/purchase-orders/${purchaseOrderIds[0]}`);
      await expect(page).toHaveURL(new RegExp(`/purchase-orders/${purchaseOrderIds[0]}$`));
      await expect(
        page.getByRole("heading", { name: "PO-E2E-001", exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Acme Foods", { exact: true })).toBeVisible();
      await expect(page.getByText("ORS-E2E-001", { exact: true })).toBeVisible();
      await expect(page.getByText("Kitchen delivery", { exact: true })).toBeVisible();
      await expect(
        page.getByText("No Delivery Receipts yet.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.locator('[data-delivery-receipt-history="empty"]'),
      ).toBeVisible();
      const recordDeliveryLink = page.getByRole("link", {
        name: "Record delivery",
        exact: true,
      });
      await expect(recordDeliveryLink).toHaveAttribute(
        "href",
        `/purchase-orders/${purchaseOrderIds[0]}/record-delivery`,
      );
      await recordDeliveryLink.click();
      await expect(
        page.getByRole("heading", { name: "Record delivery", exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Item", exact: true })).toBeDisabled();
      await expect(page.getByRole("textbox", { name: "Item", exact: true })).toHaveValue("No active Items available");
      await expect(page.getByRole("button", { name: "Post delivery", exact: true })).toBeDisabled();
      const backToPurchaseOrder = page.getByRole("link", {
        name: "Back to Purchase Order",
        exact: true,
      });
      await expect(backToPurchaseOrder).toHaveAttribute(
        "href",
        `/purchase-orders/${purchaseOrderIds[0]}`,
      );
      await backToPurchaseOrder.focus();
      await expect(backToPurchaseOrder).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(
        new RegExp(`/purchase-orders/${purchaseOrderIds[0]}$`),
      );
      await expect(
        page.getByRole("heading", { name: "PO-E2E-001", exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Acme Foods", { exact: true })).toBeVisible();
      await expect(page.getByText("ORS-E2E-001", { exact: true })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.body.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await page.getByRole("link", { name: "Back to Purchase Orders", exact: true }).click();
      await expect(page).toHaveURL(/\/purchase-orders$/);
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(
        page.locator('[data-can-manage-purchase-orders="false"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Add Purchase Order", exact: true }),
      ).toHaveCount(0);
      await expect(
        desktopTable.getByRole("columnheader", {
          name: "Actions",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Showing 1 to 10 of 11 results", { exact: true }),
      ).toBeVisible();

      await page
        .getByRole("button", { name: "Page 2 of 2", exact: true })
        .click();
      await expect(page).toHaveURL(/purchaseOrdersPage=2$/);
      await expect(
        page.getByText("Showing 11 to 11 of 11 results", { exact: true }),
      ).toBeVisible();
      await expect(
        page.locator("[data-purchase-orders-table-desktop]").getByText(
          "PO-E2E-011",
          { exact: true },
        ),
      ).toBeVisible();

      const search = page.getByRole("searchbox", {
        name: "Search Purchase Orders",
        exact: true,
      });
      await search.fill("PO-E2E-001");
      await expect(page).toHaveURL(/purchaseOrdersSearch=PO-E2E-001/);
      await expect(
        page.getByText("Showing 1 result", { exact: true }),
      ).toBeVisible();
      await expect(
        page.locator("[data-purchase-orders-table-desktop]").getByText(
          "PO-E2E-001",
          { exact: true },
        ),
      ).toBeVisible();

      await search.fill("does-not-exist");
      await expect(
        page.getByText("No Purchase Orders match your current search.", {
          exact: true,
        }),
      ).toBeVisible();
      await search.fill("");
      await expect(
        page.getByText("Showing 1 to 10 of 11 results", { exact: true }),
      ).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator("[data-purchase-orders-mobile]")).toBeVisible();
      await expect(page.locator("[data-purchase-orders-table-desktop]")).toBeHidden();
      expect(
        await page.evaluate(
          () => document.body.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    } finally {
      withE2eDatabase((database) => {
        const deletePurchaseOrder = database.prepare(
          'DELETE FROM "purchase_order" WHERE "id" = ?',
        );
        purchaseOrderIds.forEach((purchaseOrderId) => {
          deletePurchaseOrder.run(purchaseOrderId);
        });
      });
    }
  });
});

test.describe("Purchase Orders administration journey", () => {
  test("locks the Vendor and delete workflow after a Delivery Receipt is posted", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const purchaseOrderId = randomUUID();
    const receiptId = randomUUID();

    try {
      withE2eDatabase((database) => {
        database.prepare(
          `INSERT INTO "purchase_order"
           ("id", "purchaseOrderNo", "normalizedPurchaseOrderNo", "vendorId", "referenceNumber", "note", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        ).run(
          purchaseOrderId,
          "PO-E2E-LOCKED-ORIGINAL",
          "po-e2e-locked-original",
          "e2e-vendor-acme",
          "ORS-E2E-LOCKED-ORIGINAL",
          "Original note",
        );
        database.prepare(
          `INSERT INTO "delivery_receipt"
           ("id", "purchaseOrderId", "vendorId", "vendorName", "purchaseOrderNo", "receiptNo", "normalizedReceiptNo", "receiptDate", "postedAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        ).run(
          receiptId,
          purchaseOrderId,
          "e2e-vendor-acme",
          "Acme Foods",
          "PO-E2E-LOCKED-ORIGINAL",
          "DR-E2E-LOCKED-1",
          "dr-e2e-locked-1",
        );
      });

      await signIn(page, "municipal.admin", adminPassword);
      await page.goto("/purchase-orders");
      const row = page.locator(
        '[data-purchase-orders-table-desktop] [data-purchase-order-id]',
      ).filter({ hasText: "PO-E2E-LOCKED-ORIGINAL" });
      await expect(row).toBeVisible();
      await row.getByRole("button", {
        name: "Actions for PO-E2E-LOCKED-ORIGINAL",
        exact: true,
      }).click();
      await expect(page.getByRole("menuitem", { name: "Delete", exact: true })).toHaveCount(0);
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("combobox", { name: "Vendor", exact: true })).toBeDisabled();
      await expect(dialog.getByText("Vendor is locked after a Delivery Receipt is posted.", { exact: true })).toBeVisible();
      await dialog.getByRole("textbox", { name: "Purchase Order No.", exact: true }).fill("PO-E2E-LOCKED-CORRECTED");
      await dialog.getByLabel("Reference number (optional)", { exact: true }).fill("ORS-E2E-LOCKED-CORRECTED");
      await dialog.getByLabel("Note (optional)", { exact: true }).fill("Corrected note");
      await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.locator(
        '[data-purchase-orders-table-desktop] [data-purchase-order-id]',
      ).filter({ hasText: "PO-E2E-LOCKED-CORRECTED" })).toBeVisible();

      expect(withE2eDatabase((database) => database.prepare(
        'SELECT "purchaseOrderNo", "vendorId", "vendorName" FROM "delivery_receipt" WHERE "id" = ?',
      ).get(receiptId))).toEqual({
        purchaseOrderNo: "PO-E2E-LOCKED-ORIGINAL",
        vendorId: "e2e-vendor-acme",
        vendorName: "Acme Foods",
      });
    } finally {
      withE2eDatabase((database) => {
        database.prepare('DELETE FROM "delivery_receipt" WHERE "id" = ?').run(receiptId);
        database.prepare('DELETE FROM "purchase_order" WHERE "id" = ?').run(purchaseOrderId);
      });
    }
  });

  test("lets administrators create, edit, and delete a Purchase Order", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    try {
      await signIn(page, "municipal.admin", adminPassword);
      await page.goto("/purchase-orders");
      await expect(
        page.locator('[data-can-manage-purchase-orders="true"]'),
      ).toBeVisible();

      const addButton = page.getByRole("button", {
        name: "Add Purchase Order",
        exact: true,
      });
      await expect(addButton).toBeVisible();
      await addButton.focus();
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", { name: "Add Purchase Order", exact: true }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("textbox", {
          name: "Purchase Order No.",
          exact: true,
        }),
      ).toBeFocused();
      await dialog
        .getByRole("textbox", { name: "Purchase Order No.", exact: true })
        .fill(" PO-E2E-CRUD-001 ");
      await dialog.getByRole("combobox", { name: "Vendor", exact: true }).click();
      await expect(
        page.getByRole("option", { name: "Acme Foods", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Harbor Market", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("option", { name: "Acme Foods", exact: true })
        .click();
      await dialog
        .getByLabel("Reference number (optional)", { exact: true })
        .fill(" ORS-E2E-CRUD-001 ");
      await dialog
        .getByLabel("Note (optional)", { exact: true })
        .fill("  Kitchen delivery  ");
      await dialog
        .getByRole("button", { name: "Add Purchase Order", exact: true })
        .click();
      await expect(dialog).toBeHidden();

      const desktopRow = page.locator(
        '[data-purchase-orders-table-desktop] [data-purchase-order-id]',
      ).filter({ hasText: "PO-E2E-CRUD-001" });
      await expect(desktopRow).toBeVisible();
      await expect(desktopRow).toContainText("Acme Foods");
      await expect(desktopRow).toContainText("ORS-E2E-CRUD-001");

      await desktopRow
        .getByRole("button", {
          name: "Actions for PO-E2E-CRUD-001",
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
      const normalizedDialog = page.getByRole("dialog");
      await expect(
        normalizedDialog.getByLabel("Reference number (optional)", {
          exact: true,
        }),
      ).toHaveValue("ORS-E2E-CRUD-001");
      await expect(
        normalizedDialog.getByLabel("Note (optional)", { exact: true }),
      ).toHaveValue("Kitchen delivery");
      await normalizedDialog
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
      await expect(normalizedDialog).toBeHidden();

      await addButton.click();
      const duplicateDialog = page.getByRole("dialog");
      await duplicateDialog
        .getByRole("textbox", { name: "Purchase Order No.", exact: true })
        .fill("po-e2e-crud-001");
      await duplicateDialog
        .getByRole("combobox", { name: "Vendor", exact: true })
        .click();
      await page
        .getByRole("option", { name: "Acme Foods", exact: true })
        .click();
      await duplicateDialog
        .getByRole("button", { name: "Add Purchase Order", exact: true })
        .click();
      await expect(
        duplicateDialog.locator(
          '[data-slot="alert"][role="alert"] [data-slot="alert-description"]',
        ),
      ).toBeVisible();
      await expect(
        duplicateDialog.locator(
          '[data-slot="alert"][role="alert"] [data-slot="alert-description"]',
        ),
      ).toHaveText("A Purchase Order with that number already exists.");
      await expect(
        duplicateDialog.getByRole("textbox", {
          name: "Purchase Order No.",
          exact: true,
        }),
      ).toHaveValue("po-e2e-crud-001");
      await duplicateDialog
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Discard changes", exact: true })
        .click();
      await expect(duplicateDialog).toBeHidden();

      await desktopRow
        .getByRole("button", {
          name: "Actions for PO-E2E-CRUD-001",
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
      const editDialog = page.getByRole("dialog");
      await expect(
        editDialog.getByRole("heading", {
          name: "Edit Purchase Order",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        editDialog.getByRole("textbox", {
          name: "Purchase Order No.",
          exact: true,
        }),
      ).toHaveValue("PO-E2E-CRUD-001");
      await editDialog
        .getByLabel("Reference number (optional)", { exact: true })
        .fill("ORS-E2E-CRUD-UPDATED");
      await editDialog
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(editDialog).toBeHidden();
      await expect(desktopRow).toContainText("ORS-E2E-CRUD-UPDATED");
      await expect(
        desktopRow.getByRole("button", {
          name: "Actions for PO-E2E-CRUD-001",
          exact: true,
        }),
      ).toBeFocused();

      await page.reload();
      await expect(
        page.locator('[data-purchase-orders-table-desktop] [data-purchase-order-id]')
          .filter({ hasText: "PO-E2E-CRUD-001" }),
      ).toContainText("ORS-E2E-CRUD-UPDATED");
      await expect(
        page.locator('[data-client-ready="true"]'),
      ).toBeVisible();

      const refreshedDesktopRow = page
        .locator('[data-purchase-orders-table-desktop] [data-purchase-order-id]')
        .filter({ hasText: "PO-E2E-CRUD-001" });

      await refreshedDesktopRow
        .getByRole("button", {
          name: "Actions for PO-E2E-CRUD-001",
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const deleteDialog = page.getByRole("alertdialog");
      await expect(deleteDialog).toBeVisible();
      await deleteDialog
        .getByRole("button", { name: "Delete Purchase Order", exact: true })
        .click();
      await expect(deleteDialog).toBeHidden();
      await expect(refreshedDesktopRow).toHaveCount(0);
      await expect(addButton).toBeFocused();
    } finally {
      withE2eDatabase((database) => {
        database
          .prepare(
            'DELETE FROM "purchase_order" WHERE "purchaseOrderNo" = ?',
          )
          .run("PO-E2E-CRUD-001");
      });
    }
  });
});

test.describe("Delivery Receipt alternate Unit journey", () => {
  test("lets authenticated staff post configured alternate and Base Unit quantities", async ({ page }) => {
    test.setTimeout(120_000);
    const purchaseOrderId = randomUUID();
    const itemId = randomUUID();
    const secondItemId = randomUUID();
    const categoryId = randomUUID();
    const baseUnitId = randomUUID();
    const alternateUnitId = randomUUID();
    const conversionId = randomUUID();

    try {
      withE2eDatabase((database) => {
        database.prepare('INSERT INTO "unit" ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(baseUnitId, "Kilogram", "kg", `kg-${baseUnitId}`, `kg-${baseUnitId}`);
        database.prepare('INSERT INTO "unit" ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(alternateUnitId, "Sack", "sack", `sack-${alternateUnitId}`, `sack-${alternateUnitId}`);
        database.prepare('INSERT INTO "category" ("id", "name", "normalizedName", "isActive", "createdAt", "updatedAt") VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(categoryId, "Rice", `rice-${categoryId}`);
        database.prepare('INSERT INTO "item" ("id", "name", "normalizedName", "categoryId", "baseUnitId", "isActive", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(itemId, "E2E Rice", `e2e-rice-${itemId}`, categoryId, baseUnitId);
        database.prepare('INSERT INTO "item" ("id", "name", "normalizedName", "categoryId", "baseUnitId", "isActive", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(secondItemId, "E2E Beans", `e2e-beans-${secondItemId}`, categoryId, baseUnitId);
        database.prepare('INSERT INTO "item_unit_conversion" ("id", "itemId", "alternateUnitId", "baseUnitQuantity", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(conversionId, itemId, alternateUnitId, "25");
        database.prepare('INSERT INTO "purchase_order" ("id", "purchaseOrderNo", "normalizedPurchaseOrderNo", "vendorId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)').run(purchaseOrderId, "PO-E2E-RECEIPT-ALT", "po-e2e-receipt-alt", "e2e-vendor-acme");
      });

      await signIn(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/purchase-orders/${purchaseOrderId}/record-delivery`);
      await expect(page.getByRole("heading", { name: "Record delivery", exact: true })).toBeVisible();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const linesTable = page.getByRole("table", { name: "Delivery Receipt lines", exact: true });
      await expect(linesTable).toBeVisible();
      await expect(linesTable.getByRole("columnheader")).toHaveText([
        "Item",
        "Unit",
        "Delivered quantity",
        "Calculated Base Unit quantity",
        "Actual received quantity",
        "Remove",
      ]);
      expect(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const today = await page.evaluate(() => new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(new Date()));
      await expect(page.locator("#receiptDate")).toContainText(today);
      await page.locator("#receiptDate").click();
      await page.locator('[data-slot="calendar"] button[data-day="9/3/2026"]').click();
      await expect(page.locator("#receiptDate")).toContainText("September 3, 2026");
      await page.getByLabel("Receipt number", { exact: true }).fill("DR-E2E-ALT");
      const itemPicker = page.getByRole("combobox", { name: "Item", exact: true });
      await itemPicker.fill("not-an-active-item");
      await expect(page.getByText("No active Items match your search.", { exact: true })).toBeVisible();
      await itemPicker.fill("E2E Rice");
      await itemPicker.press("ArrowDown");
      await itemPicker.press("Enter");
      await page.getByRole("combobox", { name: "Unit", exact: true }).click();
      await page.getByRole("option", { name: "Sack (25 kg)", exact: true }).click();
      await page.getByLabel("Quantity", { exact: true }).fill("2.5");
      await expect(page.getByLabel("Calculated Base Unit quantity", { exact: true })).toHaveValue("62.5");
      const adjustActualQuantity = page.getByRole("button", { name: "Adjust actual quantity", exact: true });
      await expect(page.getByText("Same as calculated (62.5)", { exact: true })).toBeVisible();
      await adjustActualQuantity.click();
      await expect(page.getByLabel("Actual received Base Unit quantity", { exact: true })).toBeFocused();
      await page.getByLabel("Actual received Base Unit quantity", { exact: true }).fill("62.50");
      await expect(page.getByLabel("Actual received Base Unit quantity", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Variance note", { exact: true })).toHaveCount(0);
      await adjustActualQuantity.click();
      await page.getByLabel("Actual received Base Unit quantity", { exact: true }).fill("60");
      await page.getByLabel("Variance note", { exact: true }).fill("2.5 kg rejected at inspection");
      await itemPicker.fill("E2E Beans");
      await page.getByRole("option", { name: "E2E Beans", exact: true }).click();
      await expect(page.getByRole("combobox", { name: "Unit", exact: true })).toContainText("Kilogram (kg)");
      await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("");
      await expect(page.getByLabel("Actual received Base Unit quantity", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Variance note", { exact: true })).toHaveCount(0);
      await itemPicker.fill("E2E Rice");
      await page.getByRole("option", { name: "E2E Rice", exact: true }).click();
      await page.getByRole("combobox", { name: "Unit", exact: true }).click();
      await page.getByRole("option", { name: "Kilogram (kg)", exact: true }).click();
      await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("");
      await expect(page.getByLabel("Actual received Base Unit quantity", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Variance note", { exact: true })).toHaveCount(0);
      await page.getByRole("combobox", { name: "Unit", exact: true }).click();
      await page.getByRole("option", { name: "Sack (25 kg)", exact: true }).click();
      await page.getByLabel("Quantity", { exact: true }).fill("2.5");
      await adjustActualQuantity.click();
      await page.getByLabel("Actual received Base Unit quantity", { exact: true }).fill("60");
      await page.getByLabel("Variance note", { exact: true }).fill("2.5 kg rejected at inspection");
      await page.getByRole("button", { name: "Add line", exact: true }).click();
      await expect(page.getByText("2 lines", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Remove delivery line 2", exact: true }).click();
      await expect(page.getByText("1 line", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Post delivery", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/purchase-orders/${purchaseOrderId}#delivery-receipt-`));
      await expect(page.getByRole("heading", { name: "Delivery Receipt history", exact: true })).toBeVisible();
      await expect(page.getByRole("cell", { name: "2", exact: true })).toBeVisible();
      await expect(page.getByText("Sep 3, 2026", { exact: true })).toBeVisible();
      expect(withE2eDatabase((database) => database.prepare(
        'SELECT "receiptDate" FROM "delivery_receipt" WHERE "purchaseOrderId" = ? AND "receiptNo" = ?',
      ).get(purchaseOrderId, "DR-E2E-ALT"))).toEqual({
        receiptDate: "2026-09-03T00:00:00.000Z",
      });

      await page.goto(`/purchase-orders/${purchaseOrderId}/record-delivery`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.getByLabel("Receipt number", { exact: true }).fill("DR-E2E-ALT");
      await page.getByRole("combobox", { name: "Item", exact: true }).click();
      await page.getByRole("option", { name: "E2E Rice", exact: true }).click();
      await expect(page.getByRole("combobox", { name: "Unit", exact: true })).toContainText("Kilogram (kg)");
      await page.getByLabel("Quantity", { exact: true }).fill("3");
      await expect(page.getByLabel("Calculated Base Unit quantity", { exact: true })).toHaveValue("3");
      await page.getByRole("button", { name: "Post delivery", exact: true }).click();
      await expect(page.locator('[data-slot="alert"]')).toContainText("A Delivery Receipt with that number already exists for this Vendor.");
      await expect(page).toHaveURL(new RegExp(`/purchase-orders/${purchaseOrderId}/record-delivery$`));
      await page.getByLabel("Receipt number", { exact: true }).fill("DR-E2E-BASE");
      await page.getByRole("button", { name: "Post delivery", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/purchase-orders/${purchaseOrderId}#delivery-receipt-`));

      withE2eDatabase((database) => {
        const lines = database.prepare('SELECT "selectedUnitId", "enteredQuantity", "conversionFactor", "calculatedBaseUnitQuantity", "actualReceivedBaseUnitQuantity", "varianceNote" FROM "delivery_receipt_line" WHERE "itemId" = ? ORDER BY rowid').all(itemId);
        expect(lines).toEqual([
          { selectedUnitId: alternateUnitId, enteredQuantity: "2.5", conversionFactor: "25", calculatedBaseUnitQuantity: "62.5", actualReceivedBaseUnitQuantity: "60", varianceNote: "2.5 kg rejected at inspection" },
          { selectedUnitId: baseUnitId, enteredQuantity: "3", conversionFactor: "1", calculatedBaseUnitQuantity: "3", actualReceivedBaseUnitQuantity: "3", varianceNote: null },
        ]);
      });
    } finally {
      withE2eDatabase((database) => {
        database.prepare('DELETE FROM "inventory_ledger_movement" WHERE "itemId" = ?').run(itemId);
        database.prepare('DELETE FROM "delivery_receipt_line" WHERE "itemId" = ?').run(itemId);
        database.prepare('DELETE FROM "delivery_receipt" WHERE "purchaseOrderId" = ?').run(purchaseOrderId);
        database.prepare('DELETE FROM "purchase_order" WHERE "id" = ?').run(purchaseOrderId);
        database.prepare('DELETE FROM "item_unit_conversion" WHERE "id" = ?').run(conversionId);
        database.prepare('DELETE FROM "item" WHERE "id" = ?').run(itemId);
        database.prepare('DELETE FROM "item" WHERE "id" = ?').run(secondItemId);
        database.prepare('DELETE FROM "category" WHERE "id" = ?').run(categoryId);
        database.prepare('DELETE FROM "unit" WHERE "id" IN (?, ?)').run(baseUnitId, alternateUnitId);
      });
    }
  });
});
