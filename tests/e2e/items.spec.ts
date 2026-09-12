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
  if (!databasePath) {
    throw new Error("MASANAO_E2E_DATABASE_PATH is not set");
  }

  const database = new Database(databasePath);
  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function createItemFixtures() {
  const categoryId = randomUUID();
  const baseUnitId = randomUUID();
  const activeItemId = randomUUID();
  const inactiveItemId = randomUUID();

  withE2eDatabase((database) => {
    database
      .prepare(
        `INSERT INTO "category"
         ("id", "name", "normalizedName", "isActive", "createdAt", "updatedAt")
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(categoryId, "Dry Goods", "dry goods");
    database
      .prepare(
        `INSERT INTO "unit"
         ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(baseUnitId, "Kilogram", "kg", "kilogram", "kg");

    const insertItem = database.prepare(
      `INSERT INTO "item"
       ("id", "name", "normalizedName", "categoryId", "baseUnitId", "note", "isActive", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    );
    insertItem.run(
      activeItemId,
      "Alpha Beans",
      "alpha beans",
      categoryId,
      baseUnitId,
      null,
      1,
    );
    insertItem.run(
      inactiveItemId,
      "Retired Rice",
      "retired rice",
      categoryId,
      baseUnitId,
      "Previous stock",
      0,
    );
  });

  return { activeItemId, inactiveItemId };
}

test.describe("Items catalog journey", () => {
  test("lets authenticated staff browse empty and populated Items without mutation controls", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await signIn(page);
    await page.goto("/items");

    await expect(page).toHaveURL(/\/items$/);
    await expect(
      page.getByRole("link", { name: "Items", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { name: "Items", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("No Items yet.", { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-can-manage-items="false"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /(?:Create|Add) Item/i }),
    ).toHaveCount(0);

    createItemFixtures();
    await page.reload();

    const desktopTable = page.locator("[data-items-table-desktop]");
    await expect(desktopTable).toBeVisible();
    await expect(page.locator("[data-items-mobile]")).toBeHidden();
    for (const column of ["Name", "Category", "Base Unit", "Status"]) {
      await expect(
        desktopTable.getByRole("columnheader", { name: column, exact: true }),
      ).toBeVisible();
    }

    const activeRow = page.getByRole("row").filter({
      has: page.getByText("Alpha Beans", { exact: true }),
    });
    await expect(activeRow).toBeVisible();
    await expect(activeRow.getByText("Dry Goods", { exact: true })).toBeVisible();
    await expect(activeRow.getByText("Kilogram", { exact: true })).toBeVisible();
    await expect(activeRow.getByText("Active", { exact: true })).toBeVisible();

    const inactiveRow = page.getByRole("row").filter({
      has: page.getByText("Retired Rice", { exact: true }),
    });
    await expect(inactiveRow).toBeVisible();
    await expect(inactiveRow.getByText("Inactive", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /(?:Create|Add) Item/i }),
    ).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/items");

    await expect(page.locator("[data-items-mobile]")).toBeVisible();
    await expect(desktopTable).toBeHidden();
    await expect(
      page.locator('[data-items-mobile]').getByText("Alpha Beans", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-items-mobile]').getByText("Retired Rice", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-items-mobile]').getByText("Dry Goods", { exact: true }),
    ).toHaveCount(2);
    await expect(
      page.locator('[data-items-mobile]').getByText("Kilogram", { exact: true }),
    ).toHaveCount(2);

    const metrics = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.bodyScrollWidth).toBe(metrics.clientWidth);

    const sidebarTrigger = page.locator('[data-slot="sidebar-trigger"]');
    await sidebarTrigger.click();
    const mobileSidebar = page.locator(
      '[data-sidebar="sidebar"][data-mobile="true"]',
    );
    await expect(mobileSidebar).toBeVisible();
    await expect(
      mobileSidebar.getByText("Supply Operations", { exact: true }),
    ).toBeVisible();
    await expect(
      mobileSidebar.getByRole("link", { name: "Items", exact: true }),
    ).toBeVisible();
  });
});
