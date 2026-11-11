import Database from "better-sqlite3";
import { expect, test, type Page } from "@playwright/test";
import { postFixtureSignIn } from "./fixture-auth";
import { expectFullRecordHeading } from "./workspace-layout-helpers";

const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page) {
  const response = await postFixtureSignIn(page.request, {
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

async function signInAsAdministrator(page: Page) {
  const response = await postFixtureSignIn(page.request, {
    data: {
      username: "municipal.admin",
      password: "administrator-password",
    },
    headers: {
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3019",
    },
  });

  expect(response.status()).toBe(200);
}

async function chooseIngredient(page: Page, index: number, name: string) {
  const picker = page.getByLabel(`Ingredient ${index} Item`);
  await picker.click();
  await picker.pressSequentially(name);
  await picker.press("ArrowDown");
  await expect(picker).toHaveAttribute("aria-expanded", "true");
  await picker.press("Enter");
  await expect(page.getByLabel(`Ingredient ${index} Unit`)).toBeEnabled();
}

test("lets authenticated kitchen staff browse active Recipes only", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page);
  await page.goto("/recipes");

  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Recipes", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  await expect(page.getByText("Retired Soup", { exact: true })).toHaveCount(0);
  await expect(
    page.locator('[data-recipe-id="e2e-recipe-active"]'),
  ).toContainText("Active");
  await expect(page.getByRole("link", { name: "Create Recipe" })).toHaveCount(0);
  await page.getByLabel("Actions for Chicken Tinola").click();
  await expect(page.getByRole("menuitem", { name: "View", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  const preview = page.locator('[data-slot="dialog-content"]');
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  await expect(preview.getByText(/Baseline pax not set/)).toBeVisible();
  await expect(preview.getByRole("cell", { name: "Rice", exact: true })).toBeVisible();
  await expect(preview.getByRole("cell", { name: "1.5", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await page.getByRole("link", { name: "Chicken Tinola", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Chicken Tinola", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();
  await expect(page.getByText(/Baseline pax not set/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "Rice", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "1.5", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Recipe" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit Recipe" })).toHaveCount(0);
  await page.goto("/recipes/e2e-recipe-active/edit");
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active$/);
  await expect(page.getByRole("heading", { name: "Chicken Tinola", exact: true })).toBeVisible();
  await expect(page.getByLabel("Ingredients for ___ pax")).toHaveCount(0);
});

test("lets an administrator open the Recipe editor from the catalog action menu", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

  await page.getByLabel("Actions for Chicken Tinola").click();
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Deactivate", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete Recipe", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active\/edit$/);
  await expect(page.getByRole("heading", { name: "Chicken Tinola", level: 1, exact: true })).toBeVisible();
  await expect(page.getByText("Edit Recipe", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes$/);
});

test("completes a legacy Recipe baseline without changing its ingredients", async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsAdministrator(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/recipes/e2e-recipe-active/edit");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const baseline = page.getByLabel("Ingredients for ___ pax");
  await expect(page.getByText("Baseline pax not set")).toBeVisible();
  await expect(page.getByText(/redefines this batch; it does not multiply or change ingredient quantities/)).toBeVisible();
  await page.getByRole("button", { name: "Save Recipe" }).click();
  await expect(baseline).toHaveAttribute("aria-invalid", "true");
  await expect(baseline).toHaveAccessibleDescription(/Enter the number of people these ingredients serve\./);
  await expect(page.locator("#recipe-baseline-pax-error")).toHaveCSS("clip-path", "inset(50%)");
  await baseline.focus();
  await page.keyboard.type("50");
  await page.getByRole("button", { name: "Save Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active$/);
  await expect(page.getByText(/Ingredients for 50 pax/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "1.5", exact: true })).toBeVisible();
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Actions for Chicken Tinola").click();
  await page.getByRole("menuitem", { name: "View", exact: true }).click();
  await expect(page.locator('[data-slot="dialog-content"]').getByText(/Ingredients for 50 pax/)).toBeVisible();
});

test("gives administrators lifecycle actions for inactive Recipes in the catalog", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

  await page.getByLabel("Actions for Retired Soup").click();
  await expect(page.getByRole("menuitem", { name: "Reactivate", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete Recipe", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Delete Recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Delete Retired Soup?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("lets an administrator manage an inactive Recipe from its detail page", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes/e2e-recipe-inactive");

  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-inactive$/);
  await expect(page.getByRole("heading", { name: "Retired Soup", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivate", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete Recipe", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit Recipe", exact: true })).toHaveCount(0);
});

test("searches, paginates, and clamps the active Recipes catalog", async ({ page }) => {
  await signIn(page);
  await page.goto("/recipes?recipesPage=99");

  await expect(page).toHaveURL(/\/recipes\?recipesPage=2$/);
  await expect(page.getByText("Zesty Recipe 10", { exact: true })).toBeVisible();
  await expect(page.getByText("Chicken Tinola", { exact: true })).toHaveCount(0);

  await page.getByLabel("Search Recipes").fill("  chicken   tinola ");
  await expect(page).toHaveURL(/recipesSearch=\+\+chicken\+\+\+tinola\+$/);
  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  await expect(page.getByText("Zesty Recipe 10", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();

  await page.getByLabel("Search Recipes").fill("not a recipe");
  await expect(page.getByText("No Recipes match your search.", { exact: true })).toBeVisible();
  await page.getByRole("search").getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page).toHaveURL("/recipes");
  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/\/recipes\?recipesPage=2$/);
  await expect(page.getByText("Zesty Recipe 10", { exact: true })).toBeVisible();
});

test("preserves a new Recipe search while clamping an out-of-range page", async ({ page }) => {
  await signIn(page);
  await page.goto("/recipes?recipesPage=2");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const search = page.getByLabel("Search Recipes");
  await expect(search).toBeVisible();

  await search.fill("chicken");
  await expect(search).toHaveValue("chicken");
  await expect(page).toHaveURL(/recipesSearch=chicken$/);
  await expect(search).toHaveValue("chicken");
});

test("lets an administrator create a Base Unit Recipe", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes");

  await page.getByRole("link", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Recipe name").fill("Rice Porridge");
  await page.getByLabel("Preparation note").fill("Cook until soft.");
  await page.getByLabel("Ingredients for ___ pax").fill("50");
  await chooseIngredient(page, 1, "Rice");
  await page.getByLabel("Ingredient 1 quantity").fill("2.5");
  await expect(page.getByText("Kilogram (kg)", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Rice Porridge", exact: true })).toBeVisible();
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.getByText(/Ingredients for 50 pax/)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("created-recipe-desktop.png"), fullPage: true });
});

test("shows accessible baseline errors and keeps the Recipe editor usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signInAsAdministrator(page);
  await page.goto("/recipes/new");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Recipe name").fill("Missing Baseline Soup");
  await chooseIngredient(page, 1, "Rice");
  await page.getByLabel("Ingredient 1 quantity").fill("1");
  await page.getByRole("button", { name: "Create Recipe" }).click();
  const baseline = page.getByLabel("Ingredients for ___ pax");
  await expect(baseline).toHaveAttribute("aria-invalid", "true");
  await expect(baseline).toHaveAccessibleDescription(/Enter the number of people these ingredients serve\./);
  await expect(page.locator("#recipe-baseline-pax-error")).toHaveCSS("clip-path", "inset(50%)");
  await baseline.focus();
  await page.keyboard.type("1");
  await expect(baseline).toHaveValue("1");
  await expect(baseline).toHaveAttribute("aria-invalid", "false");
  const widths = await page.locator("body").evaluate((body) => ({ client: body.clientWidth, scroll: body.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("shows field errors for nonempty invalid baseline values without losing the Recipe draft", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signInAsAdministrator(page);
  await page.goto("/recipes/new");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Recipe name").fill("Invalid Baseline Soup");
  await chooseIngredient(page, 1, "Rice");
  await page.getByLabel("Ingredient 1 quantity").fill("1.2500");
  const baseline = page.getByLabel("Ingredients for ___ pax");
  for (const invalidValue of ["0", "1.5", "2147483648"]) {
    await baseline.fill(invalidValue);
    await baseline.press("Tab");
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await expect(baseline).toHaveAttribute("aria-invalid", "true");
    const detail = page.locator("#recipe-baseline-pax-error");
    await expect(detail).toHaveCSS("clip-path", "inset(50%)");
    await expect(detail).toHaveCSS("width", "1px");
    await expect(page.getByLabel("Recipe name")).toHaveValue("Invalid Baseline Soup");
    await expect(page.getByLabel("Ingredient 1 quantity")).toHaveValue("1.2500");
    await expect(baseline).toHaveValue(invalidValue);
  }
  await expect(baseline).toHaveAccessibleDescription(/Enter a whole number no greater than 2,147,483,647\./);
  const widths = await page.locator("body").evaluate((body) => ({ client: body.clientWidth, scroll: body.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("asks before discarding unsaved Recipe changes", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes/new");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

  await page.getByLabel("Recipe name").fill("Unsaved Recipe");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Discard unsaved changes?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes$/);
});

test("lets an administrator preview an alternate Unit Ingredient in its Base Unit", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await signInAsAdministrator(page);
  await page.goto("/recipes/new");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

  await page.getByLabel("Recipe name").fill("Gram Rice Porridge");
  await page.getByLabel("Ingredients for ___ pax").fill("50");
  await chooseIngredient(page, 1, "Rice");
  await page.getByLabel("Ingredient 1 quantity").fill("500");
  await page.getByLabel("Ingredient 1 Unit").click();
  await page.getByRole("option", { name: "Gram (0.001 kg)", exact: true }).click();
  await expect(page.getByText("0.5 kg", { exact: true })).toBeVisible();

  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  const setGramActive = database.prepare('UPDATE "unit" SET "active" = ? WHERE "id" = ?');
  const create = page.getByRole("button", { name: "Create Recipe" });
  const unit = page.getByLabel("Ingredient 1 Unit");
  const unavailable = "Select an available Unit conversion for this Item.";
  try {
    setGramActive.run(0, "default-unit-gram");
    await create.click();
    await expect(unit).toHaveAttribute("aria-invalid", "true");
    await expect(unit).toHaveAccessibleDescription(unavailable);
    await expect(page.locator("#recipe-ingredient-0-unit-error")).toHaveCSS("clip-path", "inset(50%)");
    const summary = page.getByRole("alert").filter({ hasText: "Could not save Recipe" });
    await expect(summary.getByText(unavailable, { exact: true })).toBeVisible();
    await unit.click();
    await page.getByRole("option", { name: /Base Unit.*Kilogram/ }).click();
    await expect(unit).toHaveAttribute("aria-invalid", "false");
    await expect(summary).toHaveCount(0);
  } finally {
    setGramActive.run(1, "default-unit-gram");
    database.close();
  }

  await unit.click();
  await page.getByRole("option", { name: "Gram (0.001 kg)", exact: true }).click();
  await create.click();
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Gram Rice Porridge", exact: true })).toBeVisible();
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("created-recipe-mobile.png"), fullPage: true });
});

for (const width of [1280, 320]) {
  test(`shows Ingredient row errors and keeps other rows correctable at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 720 });
    await signInAsAdministrator(page);
    await page.goto("/recipes/new");
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    const recipeName = page.getByRole("textbox", { name: "Recipe name", exact: true });
    const note = page.getByLabel("Preparation note", { exact: true });
    const baseline = page.getByRole("textbox", { name: "Ingredients for ___ pax", exact: true });
    const firstItem = page.getByRole("combobox", { name: "Ingredient 1 Item", exact: true });
    const firstQuantity = page.getByRole("textbox", { name: "Ingredient 1 quantity", exact: true });
    const secondQuantity = page.getByRole("textbox", { name: "Ingredient 2 quantity", exact: true });
    const create = page.getByRole("button", { name: "Create Recipe", exact: true });
    const summary = page.getByRole("alert").filter({ hasText: "Could not save Recipe" });
    const nameMark = page.locator('label[for="recipe-name"]').getByText("*", { exact: true });
    await expect(nameMark).toBeVisible();
    await expect(nameMark).toHaveAttribute("aria-hidden", "true");
    const destructive = await nameMark.evaluate((element) => getComputedStyle(element).color);
    await expect(page.locator('label[for="recipe-name"]')).not.toHaveCSS("color", destructive);
    await expect(page.locator('label[for="recipe-baseline-pax"]').getByText("*")).toHaveCSS("color", destructive);
    for (const heading of ["Item", "Quantity"]) {
      await expect(page.getByRole("columnheader", { name: heading, exact: true }).getByText("*")).toHaveCSS("color", destructive);
    }
    await expect(page.getByRole("columnheader", { name: "Unit", exact: true }).getByText("*")).toHaveCount(0);
    await expect(firstItem).toHaveAttribute("aria-required", "true");
    await expect(firstQuantity).toHaveAttribute("required", "");
    await expect(note).not.toHaveAttribute("required", "");

    await baseline.fill("50");
    await note.fill("Keep this note after validation.");
    await firstQuantity.fill("0");
    await page.getByRole("button", { name: "Add Ingredient", exact: true }).click();
    await create.click();
    await expect(summary).toBeFocused();
    for (const field of [recipeName, firstItem, firstQuantity, secondQuantity]) {
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(field).toHaveCSS("border-top-color", destructive);
    }
    await expect(recipeName).toHaveAccessibleDescription("Recipe name is required");
    await expect(firstItem).toHaveAccessibleDescription(/Select an Item\./);
    await expect(firstQuantity).toHaveAccessibleDescription("Enter a positive exact-decimal quantity.");
    await expect(page.locator("#recipe-ingredient-0-item-error")).toHaveCSS("clip-path", "inset(50%)");
    await expect(page.locator("#recipe-ingredient-0-quantity-error")).toHaveCSS("clip-path", "inset(50%)");
    await expect(note).toHaveValue("Keep this note after validation.");
    await expect(firstQuantity).toHaveValue("0");

    await chooseIngredient(page, 1, "Rice");
    await expect(page.getByLabel("Ingredient 1 Unit")).toContainText(/Base Unit.*Kilogram/);
    await firstQuantity.fill("2");
    await expect(firstItem).toHaveAttribute("aria-invalid", "false");
    await expect(firstQuantity).toHaveAttribute("aria-invalid", "false");
    await expect(secondQuantity).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "Remove Ingredient 2", exact: true }).click();

    await recipeName.fill("Chicken Tinola");
    await create.click();
    await expect(recipeName).toHaveAccessibleDescription("A Recipe with that name already exists.");
    await expect(recipeName).toHaveCSS("border-top-color", destructive);
    await expect(summary).toContainText("A Recipe with that name already exists. Enter a different Recipe name.");
    await expect(page.locator("#recipe-name-error")).toHaveCSS("clip-path", "inset(50%)");
    const validName = `Validation Rice Porridge ${width}`;
    await recipeName.fill(validName);
    await expect(recipeName).toHaveAttribute("aria-invalid", "false");
    await create.click();
    await expect(page.getByRole("heading", { name: validName, exact: true })).toBeVisible();
  });
}

test("keeps the Recipes catalog readable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page);
  await page.goto("/recipes");

  await expect(page.getByText("Chicken Tinola", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Search Recipes")).toBeVisible();
  const bodyWidths = await page.locator("body").evaluate((body) => ({
    clientWidth: body.clientWidth,
    scrollWidth: body.scrollWidth,
  }));
  expect(bodyWidths.scrollWidth).toBeLessThanOrEqual(bodyWidths.clientWidth);
});

const layoutViewports = [
  { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 768, height: 1024 },
  { width: 390, height: 640 }, { width: 320, height: 640 }, { width: 320, height: 480 },
];
const layoutRecipeName = (index: number) =>
  `Layout Recipe ${String(index).padStart(2, "0")} for Municipal Kitchen Workshop Volunteer Meal Preparation and Training`;
const layoutIngredientName = (index: number) => `Layout ingredient ${String(index).padStart(2, "0")}`;
const layoutRecipeId = "e2e-recipe-layout-20";
const layoutIngredientCount = 34;
const layoutCatalog = "/recipes?recipesSearch=Layout+Recipe&recipesPage=2";

test.describe("overflowing Recipe routes", () => {
  test.beforeAll(() => {
    const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    try {
      db.transaction(() => {
        const recipe = db.prepare(`INSERT INTO recipe
          (id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt)
          VALUES (?,?,?,50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
        const item = db.prepare(`INSERT INTO item
          (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt)
          VALUES (?,?,?,'default-category-staples-dry-goods','default-unit-kilogram','0',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
        const ingredient = db.prepare(`INSERT INTO recipe_ingredient
          (id,recipeId,itemId,enteredQuantity,createdAt,updatedAt)
          VALUES (?,?,?,'1.2500',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
        for (let index = 1; index <= 20; index++) {
          const name = layoutRecipeName(index);
          recipe.run(`e2e-recipe-layout-${index}`, name, name.toLowerCase());
        }
        for (let index = 1; index <= layoutIngredientCount; index++) {
          const name = layoutIngredientName(index);
          const itemId = `e2e-recipe-layout-item-${index}`;
          item.run(itemId, name, name.toLowerCase());
          ingredient.run(`e2e-recipe-layout-line-${index}`, layoutRecipeId, itemId);
        }
      })();
    } finally {
      db.close();
    }
  });

  test.afterAll(() => {
    const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    try {
      db.exec(`
        DELETE FROM recipe_ingredient WHERE recipeId LIKE 'e2e-recipe-layout-%';
        DELETE FROM recipe WHERE id LIKE 'e2e-recipe-layout-%';
        DELETE FROM item WHERE id LIKE 'e2e-recipe-layout-item-%';
      `);
    } finally {
      db.close();
    }
  });

  test("keeps Recipe catalog and ingredient columns reachable and restores the filtered catalog", async ({ page }, info) => {
    test.setTimeout(120_000);
    await signInAsAdministrator(page);
    await page.goto(layoutCatalog);
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    const main = page.getByRole("main");
    const sidebar = main.getByRole("button", { name: "Toggle Sidebar", exact: true });
    const catalogTitle = main.getByRole("heading", { name: "Recipes", level: 1, exact: true });
    const create = main.getByRole("link", { name: "Create Recipe", exact: true });
    const targetName = layoutRecipeName(20);
    const target = main.getByRole("link", { name: targetName, exact: true });
    const opener = main.getByRole("button", { name: `Actions for ${targetName}`, exact: true });
    const catalogTable = main.getByRole("table", { name: "Recipes", exact: true });
    const applyTextSpacing = () => page.addStyleTag({
      content: "html { font-size: 150%; } body { letter-spacing: .02em; }",
    });
    await applyTextSpacing();
    await expect(main).toHaveCount(1);
    await expect(target).toBeVisible();
    for (const { width, height } of layoutViewports) {
      await page.setViewportSize({ width, height });
      const range = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect(range, `Recipe catalog must overflow at ${width}×${height}`).toBeGreaterThan(0);
      for (const offset of [0, Math.floor(range / 2), range]) {
        await page.evaluate((y) => window.scrollTo(0, y), offset);
        await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(offset, 0);
        await expect(sidebar).toBeInViewport({ ratio: 1 });
        await expect(catalogTitle).toBeInViewport({ ratio: 1 });
        await expect(create).toBeInViewport({ ratio: 1 });
      }
      await expect(catalogTable.getByRole("columnheader", { name: "Recipe", exact: true })).toBeInViewport();
      await page.screenshot({ path: info.outputPath(`recipes-catalog-scrolled-${width}x${height}.png`), animations: "disabled" });
    }

    await opener.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "View", exact: true }).press("Enter");
    const preview = page.getByRole("dialog", { name: targetName, exact: true });
    await expect(preview).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(preview).toBeHidden();
    await expect(opener).toBeFocused();
    await target.focus();
    await page.keyboard.press("Enter");

    const detailTitle = main.getByRole("heading", { name: targetName, level: 1, exact: true });
    await expect(detailTitle).toBeVisible({ timeout: 30_000 });
    await applyTextSpacing();
    const table = main.getByRole("table", { name: "Recipe ingredients", exact: true });
    const quantityHeader = table.getByRole("columnheader", { name: "Quantity", exact: true });
    const back = main.getByRole("link", { name: "Back to Recipes", exact: true });
    const item = (index: number) => table.getByRole("row").filter({ hasText: layoutIngredientName(index) });
    for (const { width, height } of layoutViewports) {
      await page.setViewportSize({ width, height });
      const chrome = main.locator('[data-slot="workspace-chrome"]');
      const hasRoomForStickyHeader = height - (await chrome.boundingBox())!.height >= 112;
      await expect(chrome).toHaveCSS("position", hasRoomForStickyHeader ? "sticky" : "static");
      await expectFullRecordHeading(page, targetName);
      await detailTitle.evaluate((element) => element.scrollIntoView({ block: "center" }));
      await expect(detailTitle).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: info.outputPath(`recipe-heading-${width}x${height}.png`), animations: "disabled" });
      await item(1).scrollIntoViewIfNeeded();
      await expect(item(1)).toBeInViewport();
      await expect(item(layoutIngredientCount)).not.toBeInViewport();
      for (const index of [Math.floor(layoutIngredientCount / 2), layoutIngredientCount]) {
        const row = item(index);
        const quantity = row.getByRole("cell", { name: "1.2500", exact: true });
        await row.scrollIntoViewIfNeeded();
        await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
        await quantity.scrollIntoViewIfNeeded();
        await expect(quantity).toBeInViewport();
        await expect(quantityHeader).toBeInViewport();
        await expect.poll(async () => Math.abs((await quantityHeader.boundingBox())!.x - (await quantity.boundingBox())!.x)).toBeLessThan(1);
        if (hasRoomForStickyHeader) {
          await expect(sidebar).toBeInViewport({ ratio: 1 });
          await expect(detailTitle).toBeInViewport({ ratio: 1 });
          await expect(back).toBeInViewport({ ratio: 1 });
        }
      }
      await page.screenshot({ path: info.outputPath(`recipe-ingredients-scrolled-${width}x${height}.png`), animations: "disabled" });
    }
    await back.press("Enter");
    await expect(page).toHaveURL(layoutCatalog);
    await expect(main.getByLabel("Search Recipes")).toHaveValue("Layout Recipe");
    await expect(main.getByText("Showing 11 to 20 of 20 results")).toBeVisible();
  });

  test("keeps Recipe editor actions reachable through long drafts and validation", async ({ page }, info) => {
    test.setTimeout(120_000);
    await signInAsAdministrator(page);
    await page.goto(`/recipes/${layoutRecipeId}/edit?recipesSearch=Layout+Recipe&recipesPage=2`);
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    const main = page.getByRole("main");
    const sidebar = main.getByRole("button", { name: "Toggle Sidebar", exact: true });
    const title = main.getByRole("heading", { name: layoutRecipeName(20), level: 1, exact: true });
    const save = main.getByRole("button", { name: "Save Recipe", exact: true });
    const cancel = main.getByRole("button", { name: "Cancel", exact: true });
    const first = main.getByLabel("Ingredient 1 quantity", { exact: true });
    const last = main.getByLabel(`Ingredient ${layoutIngredientCount} quantity`, { exact: true });
    const pax = main.getByLabel("Ingredients for ___ pax");
    await expect(main).toHaveCount(1);
    await expect(pax).toHaveValue("50");
    await last.fill("2.5000");

    for (const { width, height } of layoutViewports) {
      await page.setViewportSize({ width, height });
      await first.scrollIntoViewIfNeeded();
      await expect(first).toBeInViewport({ ratio: 1 });
      await expect(first).toHaveValue("1.2500");
      await expect(last).not.toBeInViewport();
      for (const index of [Math.floor(layoutIngredientCount / 2), layoutIngredientCount]) {
        const quantity = main.getByLabel(`Ingredient ${index} quantity`, { exact: true });
        await quantity.scrollIntoViewIfNeeded();
        await expect(quantity).toBeInViewport({ ratio: 1 });
        for (const fixed of [title, sidebar, save, cancel]) await expect(fixed).toBeInViewport({ ratio: 1 });
        expect(await page.evaluate(() => scrollY)).toBe(0);
      }
      await expect(last).toHaveValue("2.5000");
      await expectFullRecordHeading(page, layoutRecipeName(20));
      await page.screenshot({ path: info.outputPath(`recipe-edit-scrolled-${width}x${height}.png`), animations: "disabled" });
    }

    await page.addStyleTag({ content: "html { font-size: 150%; } body { letter-spacing: .02em; }" });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport({ ratio: 0.99 });
    await last.fill("0");
    await save.press("Enter");
    const summary = main.getByRole("alert").filter({ hasText: "Could not save Recipe" });
    await expect(summary).toBeFocused();
    await expect(summary).toBeInViewport();
    await expect(last).toHaveAttribute("aria-invalid", "true");
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport({ ratio: 1 });
    await expect(last).toHaveValue("0");
    await expect(pax).toHaveValue("50");
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport({ ratio: 0.99 });
    await page.screenshot({ path: info.outputPath("recipe-edit-validation-enlarged.png"), animations: "disabled" });

    await cancel.press("Enter");
    const discard = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
    await expect(discard).toBeInViewport({ ratio: 1 });
    await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(cancel).toBeFocused();
    await expect(last).toHaveValue("0");
    await cancel.press("Enter");
    await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(page).toHaveURL(layoutCatalog);

    await main.getByRole("link", { name: "Create Recipe", exact: true }).click();
    await expectFullRecordHeading(page, "New Recipe");
    await page.addStyleTag({ content: "html { font-size: 150%; } body { letter-spacing: .02em; }" });
    const create = main.getByRole("button", { name: "Create Recipe", exact: true });
    const add = main.getByRole("button", { name: "Add Ingredient", exact: true });
    await main.getByLabel("Recipe name").fill("Layout draft");
    for (let index = 1; index < 6; index++) await add.click();
    const newLast = main.getByLabel("Ingredient 6 quantity", { exact: true });
    await newLast.fill("1.2500");
    await newLast.scrollIntoViewIfNeeded();
    await expect(newLast).toBeInViewport({ ratio: 1 });
    await expect(first).not.toBeInViewport();
    await expect(create).toBeInViewport({ ratio: 1 });
    await expect(cancel).toBeInViewport({ ratio: 1 });
    await expect(sidebar).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.screenshot({ path: info.outputPath("recipe-new-scrolled-enlarged-320x480.png"), animations: "disabled" });
    await create.press("Enter");
    await expect(summary).toBeFocused();
    await expect(pax).toHaveAttribute("aria-invalid", "true");
    await expect(newLast).toHaveValue("1.2500");
  });
});
