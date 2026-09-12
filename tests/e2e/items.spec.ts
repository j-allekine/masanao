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
  const inactiveCategoryId = randomUUID();
  const baseUnitId = randomUUID();
  const inactiveBaseUnitId = randomUUID();
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
        `INSERT INTO "category"
         ("id", "name", "normalizedName", "isActive", "createdAt", "updatedAt")
         VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(inactiveCategoryId, "Retired Categories", "retired categories");
    database
      .prepare(
        `INSERT INTO "unit"
         ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(baseUnitId, "Kilogram", "kg", "kilogram", "kg");
    database
      .prepare(
        `INSERT INTO "unit"
         ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(inactiveBaseUnitId, "Retired Unit", "ru", "retired unit", "ru");

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

  return { activeItemId, inactiveItemId, categoryId, baseUnitId };
}

function createPagingFixtures(categoryId: string, baseUnitId: string) {
  const names = [
    "Apple Sauce",
    "Baking Flour",
    "Canned Beans",
    "Diced Tomatoes",
    "Egg Noodles",
    "Fresh Carrots",
    "Green Peas",
    "Haricot Beans",
    "Island Rice",
    "Jasmine Rice",
    "Kelp Powder",
  ];

  withE2eDatabase((database) => {
    const insertItem = database.prepare(
      `INSERT INTO "item"
       ("id", "name", "normalizedName", "categoryId", "baseUnitId", "note", "isActive", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    );

    for (const name of names) {
      insertItem.run(randomUUID(), name, name.toLowerCase(), categoryId, baseUnitId);
    }
  });
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

    const fixtures = createItemFixtures();
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
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

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
    await sidebarTrigger.focus();
    await page.keyboard.press("Enter");
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
    await mobileSidebar.getByRole("button", { name: "Close", exact: true }).click();
    await expect(mobileSidebar).toBeHidden();

    await page.context().clearCookies();
    await signIn(page, "municipal.admin", adminPassword);
    await page.goto("/items");

    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    await expect(page.locator('[data-can-manage-items="true"]')).toBeVisible();
    const addItemButton = page.getByRole("button", {
      name: "Add Item",
      exact: true,
    });
    await expect(addItemButton).toBeVisible();
    await addItemButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add Item" })).toBeVisible();

    await dialog.getByRole("combobox", { name: "Category" }).click();
    await expect(
      page.getByRole("option", { name: "Dry Goods", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Retired Categories", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    await dialog.getByRole("combobox", { name: "Base Unit" }).click();
    await expect(
      page.getByRole("option", { name: "Kilogram (kg)", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Retired Unit (ru)", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    await dialog.getByRole("button", { name: "Add Item", exact: true }).click();
    await expect(dialog.getByText("Item name is required", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Category is required", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Base Unit is required", { exact: true })).toBeVisible();

    await dialog.getByLabel("Name").fill("  Brown   Rice ");
    await dialog.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Dry Goods", exact: true }).click();
    await dialog.getByRole("combobox", { name: "Base Unit" }).click();
    await page.getByRole("option", { name: "Kilogram (kg)", exact: true }).click();
    await dialog.getByLabel("Item Note (optional)").fill("Kitchen staple");
    await dialog.getByRole("button", { name: "Add Item", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.locator("[data-items-mobile]").getByText("Brown Rice", {
        exact: true,
      }).first(),
    ).toBeVisible();

    await addItemButton.click();
    const duplicateDialog = page.getByRole("dialog");
    await duplicateDialog.getByLabel("Name").fill("brown rice");
    await duplicateDialog.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Dry Goods", exact: true }).click();
    await duplicateDialog.getByRole("combobox", { name: "Base Unit" }).click();
    await page.getByRole("option", { name: "Kilogram (kg)", exact: true }).click();
    await duplicateDialog.getByRole("button", { name: "Add Item", exact: true }).click();
    await expect(
      duplicateDialog.locator(
        '[data-slot="alert"] [data-slot="alert-description"]',
      ),
    ).toHaveText("An Item with that name already exists.");
    await expect(duplicateDialog.getByLabel("Name")).toHaveValue("brown rice");

    await duplicateDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    const discardDialog = page.getByRole("alertdialog");
    await expect(discardDialog).toBeVisible();
    await discardDialog
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(duplicateDialog).toBeHidden();

    createPagingFixtures(fixtures.categoryId, fixtures.baseUnitId);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/items");
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    await expect(page.locator("[data-items-table-desktop]")).toBeVisible();
    await expect(page.getByText("Showing 1 to 10 of 14 results", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous page", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next page", exact: true })).toBeEnabled();

    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(page).toHaveURL(/items\?itemsPage=2$/);
    await expect(page.getByText("Showing 11 to 14 of 14 results", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Retired Rice", { exact: true }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/items$/);
    await expect(page.getByText("Showing 1 to 10 of 14 results", { exact: true })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/items\?itemsPage=2$/);
    await expect(page.getByText("Showing 11 to 14 of 14 results", { exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Status filter" }).click();
    await page.getByRole("option", { name: "Inactive only", exact: true }).click();
    await expect(page).toHaveURL(/items\?itemsStatus=inactive$/);
    await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Retired Rice", { exact: true }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Status filter" }).click();
    await page.getByRole("option", { name: "All Statuses", exact: true }).click();
    await page.getByLabel("Search Items").fill("does-not-exist");
    await expect(page).toHaveURL(/items\?itemsSearch=does-not-exist$/);
    await expect(page.getByText("No Items match your current filters.", { exact: true })).toBeVisible();
    await page
      .getByRole("search", { name: "Item catalog search and filters" })
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(page).toHaveURL(/\/items$/);
    await expect(page.getByText("Showing 1 to 10 of 14 results", { exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Category filter" }).click();
    await page.getByRole("option", { name: "Dry Goods", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`items\\?itemsCategory=${fixtures.categoryId}$`));
  });
});
