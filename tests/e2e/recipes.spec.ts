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
  await expect(preview.getByRole("cell", { name: "Rice", exact: true })).toBeVisible();
  await expect(preview.getByRole("cell", { name: "1.5", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await page.getByRole("link", { name: "Chicken Tinola", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/e2e-recipe-active$/);
  await expect(page.getByRole("heading", { name: "Chicken Tinola", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Rice", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "1.5", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Recipe" })).toHaveCount(0);
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
  await page.getByRole("button", { name: "Clear search" }).click();
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
  await chooseIngredient(page, 1, "Rice");
  await page.getByLabel("Ingredient 1 quantity").fill("2.5");
  await expect(page.getByText("Kilogram (kg)", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByText("Rice Porridge", { exact: true })).toBeVisible();
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
  await signInAsAdministrator(page);
  await page.goto("/recipes/new");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();

  await page.getByLabel("Recipe name").fill("Gram Rice Porridge");
  await chooseIngredient(page, 1, "Rice");
  await page.getByLabel("Ingredient 1 quantity").fill("500");
  await page.getByLabel("Ingredient 1 Unit").click();
  await page.getByRole("option", { name: "Gram (0.001 kg)", exact: true }).click();
  await expect(page.getByText("0.5 kg", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByText("Gram Rice Porridge", { exact: true })).toBeVisible();
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
