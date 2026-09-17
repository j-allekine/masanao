import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
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
    const purchaseOrderId = randomUUID();
    const vendorId = "e2e-vendor-acme";

    await signIn(page);
    await page.goto("/purchase-orders");
    await expect(page.getByRole("heading", { name: "Purchase Orders", exact: true })).toBeVisible();
    await expect(page.getByText("No Purchase Orders yet.", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Purchase Orders", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    withE2eDatabase((database) => {
      database
        .prepare(
          `INSERT INTO "purchase_order"
           ("id", "purchaseOrderNo", "normalizedPurchaseOrderNo", "vendorId", "referenceNumber", "note", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        )
        .run(
          purchaseOrderId,
          "PO-E2E-001",
          "po-e2e-001",
          vendorId,
          "ORS-E2E-001",
          "Kitchen delivery",
        );
    });

    await page.reload();
    await expect(page.getByText("PO-E2E-001", { exact: true })).toBeVisible();
    await expect(page.getByText("Acme Foods", { exact: true })).toBeVisible();
    await expect(page.getByText("ORS-E2E-001", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("[data-purchase-orders-mobile]")).toBeVisible();
    await expect(page.locator("[data-purchase-orders-table-desktop]")).toBeHidden();
    expect(
      await page.evaluate(
        () => document.body.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);

    withE2eDatabase((database) => {
      database.prepare('DELETE FROM "purchase_order" WHERE "id" = ?').run(purchaseOrderId);
    });
  });
});
