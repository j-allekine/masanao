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

async function signInAsAdministrator(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
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
  await expect(preview.getByRole("cell", { name: /1\.5/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await page.getByRole("link", { name: "Chicken Tinola", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Chicken Tinola", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();
  await expect(page.getByText(/Baseline pax not set/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "Rice", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: /1\.5/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Recipe" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit Recipe" })).toHaveCount(0);
  await page.goto("/recipes/e2e-recipe-active/edit");
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active$/);
  await expect(page.getByRole("heading", { name: "Chicken Tinola", exact: true })).toBeVisible();
  await expect(page.getByLabel("Recipe Baseline Pax")).toHaveCount(0);
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
  await expect(page.getByRole("heading", { name: "Edit Recipe", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes$/);
});

test("completes a legacy Recipe baseline without changing its ingredients", async ({ page }) => {
  test.setTimeout(60_000);
  await signInAsAdministrator(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/recipes/e2e-recipe-active/edit");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const baseline = page.getByLabel("Recipe Baseline Pax");
  await expect(page.getByText("Baseline pax not set")).toBeVisible();
  await expect(page.getByText(/redefines this batch; it does not multiply or change ingredient quantities/)).toBeVisible();
  await page.getByRole("button", { name: "Save Recipe" }).click();
  await expect(baseline).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter the number of people these ingredients serve.")).toBeVisible();
  await baseline.focus();
  await page.keyboard.type("50");
  await page.getByRole("button", { name: "Save Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active$/);
  await expect(page.getByText(/Ingredients for 50 pax/)).toBeVisible();
  await expect(page.getByRole("cell", { name: /1\.5/ })).toBeVisible();
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
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-inactive$/);
  await expect(page.getByRole("heading", { name: "Retired Soup", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Recipe actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Reactivate", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete Recipe", exact: true })).toBeVisible();
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
  await page.getByLabel("Recipe Baseline Pax").fill("50");
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
  const baseline = page.getByLabel("Recipe Baseline Pax");
  await expect(baseline).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter the number of people these ingredients serve.", { exact: true })).toBeVisible();
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
  const baseline = page.getByLabel("Recipe Baseline Pax");
  for (const invalidValue of ["0", "1.5", "2147483648"]) {
    await baseline.fill(invalidValue);
    await baseline.press("Tab");
    await page.getByRole("button", { name: "Create Recipe" }).click();
    await expect(baseline).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#recipe-baseline-pax-error")).toBeVisible();
    await expect(page.getByLabel("Recipe name")).toHaveValue("Invalid Baseline Soup");
    await expect(page.getByLabel("Ingredient 1 quantity")).toHaveValue("1.2500");
    await expect(baseline).toHaveValue(invalidValue);
  }
  await expect(page.getByText("Enter a whole number no greater than 2,147,483,647.")).toBeVisible();
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
  await page.getByLabel("Recipe Baseline Pax").fill("50");
  await chooseIngredient(page, 1, "Rice");
  await page.getByLabel("Ingredient 1 quantity").fill("500");
  await page.getByLabel("Ingredient 1 Unit").click();
  await page.getByRole("option", { name: "Gram (0.001 kg)", exact: true }).click();
  await expect(page.getByText("0.5 kg", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Gram Rice Porridge", exact: true })).toBeVisible();
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("created-recipe-mobile.png"), fullPage: true });
});

test("shows Ingredient row errors without discarding entered Recipe fields", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes/new");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Recipe name").fill("Validation Rice Porridge");
  await page.getByLabel("Preparation note").fill("Keep this note after validation.");
  await page.getByLabel("Ingredient 1 quantity").fill("0");
  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page.getByText("Could not save Recipe", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Ingredient 1 Item")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Ingredient 1 quantity")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Select an Item.", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter a positive exact-decimal quantity.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Recipe name")).toHaveValue("Validation Rice Porridge");
  await expect(page.getByLabel("Preparation note")).toHaveValue("Keep this note after validation.");
  await expect(page.getByLabel("Ingredient 1 quantity")).toHaveValue("0");
});

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

test("keeps Recipe facts and preview associated without panning across layouts", async ({ page }) => {
  test.setTimeout(90_000);
  await signInAsAdministrator(page);
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Search Recipes").fill("Chicken");
  for (const width of [1280, 900, 320]) {
    await page.setViewportSize({ width, height: 600 });
    const row = page.locator('[data-recipe-id="e2e-recipe-active"]');
    await expect(row.getByRole("link", { name: "Chicken Tinola" })).toBeVisible();
    await expect(row.getByText("Active", { exact: true })).toBeVisible();
    expect(await row.locator('[data-label="Ingredients"]').textContent()).toBe("1");
    expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await row.getByLabel("Actions for Chicken Tinola").focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "View", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("cell", { name: "Rice", exact: true })).toBeVisible();
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`recipe-preview-${width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(row.getByLabel("Actions for Chicken Tinola")).toBeFocused();
    await expect(page.getByLabel("Search Recipes")).toHaveValue("Chicken");
    await page.screenshot({ path: test.info().outputPath(`recipe-catalog-${width}.png`), fullPage: true });
  }
});


test("carries the latest typed query through Recipe record edit cancel and new cancel", async ({ page }) => {
  test.setTimeout(90_000);
  await signInAsAdministrator(page);
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Search Recipes").fill("Chicken");
  const recordLink = page.getByRole("link", { name: "Chicken Tinola", exact: true });
  await expect(recordLink).toHaveAttribute("href", /returnTo=.*Chicken/);
  await recordLink.click();
  await expect(page.getByRole("heading", { name: "Chicken Tinola", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("recipe-record-320.png"), fullPage: true });
  await page.getByRole("link", { name: "Edit Recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Edit Recipe", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chicken Tinola", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Recipes", exact: true }).last().click();
  await expect(page.getByLabel("Search Recipes")).toHaveValue("Chicken");
  await page.getByRole("link", { name: "Create Recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New Recipe", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Search Recipes")).toHaveValue("Chicken");
});
