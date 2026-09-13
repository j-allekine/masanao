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

async function expectOpenOptionIsClickable(page: Page, name: string) {
  const option = page.getByRole("option", { name, exact: true });
  await expect(option).toBeVisible();

  expect(
    await option.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const topElement = document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );

      return topElement !== null && element.contains(topElement);
    }),
  ).toBe(true);
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
  const otherInactiveCategoryId = randomUUID();
  const replacementCategoryId = randomUUID();
  const baseUnitId = randomUUID();
  const inactiveBaseUnitId = randomUUID();
  const otherInactiveBaseUnitId = randomUUID();
  const replacementBaseUnitId = randomUUID();
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
        `INSERT INTO "category"
         ("id", "name", "normalizedName", "isActive", "createdAt", "updatedAt")
         VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        otherInactiveCategoryId,
        "Other Retired Categories",
        "other retired categories",
      );
    database
      .prepare(
        `INSERT INTO "category"
         ("id", "name", "normalizedName", "isActive", "createdAt", "updatedAt")
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(replacementCategoryId, "Canned Goods", "canned goods");
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
    database
      .prepare(
        `INSERT INTO "unit"
         ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        otherInactiveBaseUnitId,
        "Other Retired Unit",
        "ou",
        "other retired unit",
        "ou",
      );
    database
      .prepare(
        `INSERT INTO "unit"
         ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        replacementBaseUnitId,
        "Piece",
        "pc",
        "piece",
        "pc",
      );

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
      inactiveCategoryId,
      inactiveBaseUnitId,
      "Previous stock",
      0,
    );
  });

  return {
    activeItemId,
    inactiveItemId,
    categoryId,
    inactiveCategoryId,
    baseUnitId,
    inactiveBaseUnitId,
    otherInactiveCategoryId,
    otherInactiveBaseUnitId,
    replacementCategoryId,
    replacementBaseUnitId,
  };
}

function removeItemFixtures(
  fixtures: ReturnType<typeof createItemFixtures>,
) {
  withE2eDatabase((database) => {
    const deleteItemsByCategory = database.prepare(
      'DELETE FROM "item" WHERE "categoryId" = ?',
    );
    const deleteItemsByUnit = database.prepare(
      'DELETE FROM "item" WHERE "baseUnitId" = ?',
    );
    const deleteCategory = database.prepare('DELETE FROM "category" WHERE "id" = ?');
    const deleteUnit = database.prepare('DELETE FROM "unit" WHERE "id" = ?');

    const categoryIds = [
      fixtures.categoryId,
      fixtures.inactiveCategoryId,
      fixtures.otherInactiveCategoryId,
      fixtures.replacementCategoryId,
    ];
    const baseUnitIds = [
      fixtures.baseUnitId,
      fixtures.inactiveBaseUnitId,
      fixtures.otherInactiveBaseUnitId,
      fixtures.replacementBaseUnitId,
    ];

    database.transaction(() => {
      for (const categoryId of categoryIds) {
        deleteItemsByCategory.run(categoryId);
      }
      for (const baseUnitId of baseUnitIds) {
        deleteItemsByUnit.run(baseUnitId);
      }
      for (const categoryId of categoryIds) {
        deleteCategory.run(categoryId);
      }
      for (const baseUnitId of baseUnitIds) {
        deleteUnit.run(baseUnitId);
      }
    })();
  });
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
  let fixturesToRemove: ReturnType<typeof createItemFixtures> | null = null;

  test.afterEach(() => {
    if (!fixturesToRemove) return;

    removeItemFixtures(fixturesToRemove);
    fixturesToRemove = null;
  });

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
    fixturesToRemove = fixtures;
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
    ).toHaveCount(1);
    await expect(
      page
        .locator('[data-items-mobile]')
        .getByText("Retired Categories", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.locator('[data-items-mobile]').getByText("Kilogram", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page
        .locator('[data-items-mobile]')
        .getByText("Retired Unit", { exact: true }),
    ).toHaveCount(1);

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

    await page.setViewportSize({ width: 667, height: 390 });
    await addItemButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add Item" })).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Add Item", exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await addItemButton.click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole("combobox", { name: "Category" }).click();
    await expectOpenOptionIsClickable(page, "Dry Goods");
    await expect(
      page.getByRole("option", { name: "Retired Categories", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");

    await dialog.getByRole("combobox", { name: "Base Unit" }).click();
    await expectOpenOptionIsClickable(page, "Kilogram (kg)");
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

    const brownRiceCard = page
      .locator('[data-items-mobile] [data-item-id]')
      .filter({ hasText: "Brown Rice" });
    await brownRiceCard
      .getByRole("button", { name: "Actions for Brown Rice", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();

    const editDialog = page.getByRole("dialog");
    await expect(
      editDialog.getByRole("heading", { name: "Edit Item", exact: true }),
    ).toBeVisible();
    await expect(editDialog.getByLabel("Name")).toHaveValue("Brown Rice");
    await editDialog.getByLabel("Name").fill("  Brown   Rice Updated ");
    await editDialog.getByRole("combobox", { name: "Category" }).click();
    await page
      .getByRole("option", { name: "Canned Goods", exact: true })
      .click();
    await editDialog.getByRole("combobox", { name: "Base Unit" }).click();
    await page
      .getByRole("option", { name: "Piece (pc)", exact: true })
      .click();
    await editDialog.getByLabel("Item Note (optional)").fill("Updated note");
    await editDialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click();

    await expect(editDialog).toBeHidden();
    const updatedRiceCard = page
      .locator('[data-items-mobile] [data-item-id]')
      .filter({ hasText: "Brown Rice Updated" });
    await expect(updatedRiceCard).toBeVisible();
    await expect(
      updatedRiceCard.getByRole("button", {
        name: "Actions for Brown Rice Updated",
        exact: true,
      }),
    ).toBeFocused();

    await updatedRiceCard
      .getByRole("button", {
        name: "Actions for Brown Rice Updated",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    const validationDialog = page.getByRole("dialog");
    await validationDialog.getByLabel("Name").fill("");
    await validationDialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      validationDialog.getByText("Item name is required", { exact: true }),
    ).toBeVisible();
    await expect(validationDialog.getByLabel("Name")).toHaveValue("");
    await validationDialog.getByLabel("Name").fill("Brown Rice Fixed");
    await validationDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    const validationDiscardDialog = page.getByRole("alertdialog");
    await validationDiscardDialog
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(validationDialog).toBeHidden();

    const retiredRiceCard = page.locator(
      `[data-items-mobile] [data-item-id="${fixtures.inactiveItemId}"]`,
    );
    await retiredRiceCard
      .getByRole("button", { name: "Actions for Retired Rice", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    const inactiveLookupDialog = page.getByRole("dialog");
    await inactiveLookupDialog
      .getByRole("combobox", { name: "Category" })
      .click();
    await expect(
      page.getByRole("option", {
        name: "Retired Categories (Inactive)",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", {
        name: "Other Retired Categories (Inactive)",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await inactiveLookupDialog
      .getByRole("combobox", { name: "Base Unit" })
      .click();
    await expect(
      page.getByRole("option", {
        name: "Retired Unit (ru) (Inactive)",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", {
        name: "Other Retired Unit (ou) (Inactive)",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await inactiveLookupDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(inactiveLookupDialog).toBeHidden();

    const alphaBeansCard = page.locator(
      `[data-items-mobile] [data-item-id="${fixtures.activeItemId}"]`,
    );
    await alphaBeansCard
      .getByRole("button", { name: "Actions for Alpha Beans", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Deactivate", exact: true })
      .click();
    await expect(alphaBeansCard.getByText("Inactive", { exact: true })).toBeVisible();
    await alphaBeansCard
      .getByRole("button", { name: "Actions for Alpha Beans", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Activate", exact: true })
      .click();
    await expect(alphaBeansCard.getByText("Active", { exact: true })).toBeVisible();

    await addItemButton.click();
    const duplicateDialog = page.getByRole("dialog");
    await duplicateDialog.getByLabel("Name").fill("brown rice updated");
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
    await expect(duplicateDialog.getByLabel("Name")).toHaveValue(
      "brown rice updated",
    );

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
    await page.reload();
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
    await page.reload();
    await expect(page).toHaveURL(/items\?itemsStatus=inactive$/);
    await expect(
      page.getByRole("combobox", { name: "Status filter" }),
    ).toContainText("Inactive only");
    await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Retired Rice", { exact: true }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Status filter" }).click();
    await page.getByRole("option", { name: "All Statuses", exact: true }).click();
    await expect(page).toHaveURL(/\/items$/);
    await page.getByLabel("Search Items").fill("does-not-exist");
    await expect(page).toHaveURL(/items\?itemsSearch=does-not-exist$/);
    await expect(page.getByText("No Items match your current filters.", { exact: true })).toBeVisible();

    await page
      .getByRole("search", { name: "Item catalog search and filters" })
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(page).toHaveURL(/\/items$/);
    await expect(page.getByText("Showing 1 to 10 of 14 results", { exact: true })).toBeVisible();

    await page.getByLabel("Search Items").fill("does-not-exist");
    await expect(page).toHaveURL(/items\?itemsSearch=does-not-exist$/);
    await page.reload();
    await expect(page).toHaveURL(/items\?itemsSearch=does-not-exist$/);
    await expect(page.getByLabel("Search Items")).toHaveValue("does-not-exist");
    await expect(page.getByText("No Items match your current filters.", { exact: true })).toBeVisible();

    await page.goto("/items");
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    await expect(page.getByLabel("Search Items")).toHaveValue("");
    await expect(page.getByText("Showing 1 to 10 of 14 results", { exact: true })).toBeVisible();

    const searchHistoryLength = await page.evaluate(() => window.history.length);
    await page.getByLabel("Search Items").pressSequentially("retired", { delay: 25 });
    await expect(page).toHaveURL(/items\?itemsSearch=retired$/);
    await expect(page.getByLabel("Search Items")).toHaveValue("retired");
    expect(await page.evaluate(() => window.history.length)).toBe(searchHistoryLength);
    await page
      .getByRole("search", { name: "Item catalog search and filters" })
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(page).toHaveURL(/\/items$/);

    await page.getByRole("combobox", { name: "Category filter" }).click();
    await expectOpenOptionIsClickable(page, "Dry Goods");
    await page.getByRole("option", { name: "Dry Goods", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`items\\?itemsCategory=${fixtures.categoryId}$`));
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Category filter" }),
    ).toContainText("Dry Goods");

    await page.getByRole("combobox", { name: "Category filter" }).click();
    await page.getByRole("option", { name: "All Categories", exact: true }).click();
    await expect(page).toHaveURL(/\/items$/);
    await page.getByLabel("Search Items").fill("Retired Rice");
    await expect(page).toHaveURL(/items\?itemsSearch=Retired(?:%20|\+)Rice$/);
    const retiredRiceRow = page.getByRole("row").filter({
      has: page.getByText("Retired Rice", { exact: true }),
    });
    await retiredRiceRow
      .getByRole("button", { name: "Actions for Retired Rice", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("alertdialog");
    await expect(
      deleteDialog.getByRole("heading", { name: /Delete .*Retired Rice/ }),
    ).toBeVisible();
    await expect(
      deleteDialog.getByText(/permanently removes the Item/, { exact: false }),
    ).toBeVisible();
    await deleteDialog
      .getByRole("button", { name: "Delete Item", exact: true })
      .click();
    await expect(deleteDialog).toBeHidden();
    await expect(
      page.getByRole("row").filter({
        has: page.getByText("Retired Rice", { exact: true }),
      }),
    ).toHaveCount(0);
    await expect(addItemButton).toBeFocused();
  });
});
