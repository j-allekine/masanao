import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

test("preserves dirty Recipe and the Back Forward chain after Stay and Discard", async ({ page }) => {
  test.setTimeout(90_000);
  const response = await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } });
  expect(response.status()).toBe(200);
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByRole("link", { name: "Create Recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "New Recipe", exact: true })).toBeVisible({timeout:30_000});
  await page.getByLabel("Recipe name").fill("Raw unsaved recipe");
  await page.evaluate(() => history.back());
  await expect(page.getByRole("heading", { name: "Discard unsaved changes?", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByLabel("Recipe name")).toHaveValue("Raw unsaved recipe");
  await page.evaluate(() => history.back());
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible();
  await page.evaluate(() => history.forward());
  await expect(page.getByRole("heading", { name: "New Recipe", exact: true })).toBeVisible({timeout:30_000});
  await expect(page.getByLabel("Recipe name")).toHaveValue("");
  await page.evaluate(() => history.back());
  await expect(page.getByRole("heading", { name: "Recipes", exact: true })).toBeVisible();
});


test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("INSERT OR IGNORE INTO recipe(id,name,normalizedName,isActive,baselinePax,createdAt,updatedAt) VALUES ('e2e-long-recipe','Long Recipe ingredient inspection','long recipe ingredient inspection',1,50,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
    for (let i = 1; i <= 12; i++) {
      const name = `Recipe line ${String(i).padStart(2,"0")} ${"Long accepted ingredient ".repeat(3)}`.slice(0,100);
      db.prepare("INSERT OR IGNORE INTO item(reorderLevel,id,name,normalizedName,categoryId,baseUnitId,isActive,createdAt,updatedAt) VALUES ('0',?,?,?,'default-category-staples-dry-goods','default-unit-kilogram',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-long-item-${i}`,name,name.toLowerCase());
      db.prepare("INSERT OR IGNORE INTO recipe_ingredient(id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES (?,'e2e-long-recipe',?,'0.125',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-long-ingredient-${i}`,`e2e-long-item-${i}`);
    }
  } finally { db.close(); }
});

async function admin(page: import("@playwright/test").Page) {
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
}

test("keeps all twelve Recipe lines and persistent actions reachable with raw decimals and reindexed errors", async ({ page }) => {
  test.setTimeout(120_000);
  await admin(page);
  await page.setViewportSize({width:320,height:480});
  await page.goto("/recipes/e2e-long-recipe/edit");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await expect(page.getByLabel("Recipe Baseline Pax")).toHaveValue("50");
  await expect(page.getByLabel("Ingredient 12 quantity",{exact:true})).toHaveValue("0.125");
  await page.getByLabel("Ingredient 12 quantity",{exact:true}).fill("0.");
  await page.getByRole("button",{name:"Save Recipe",exact:true}).click();
  await expect(page.getByLabel("Ingredient 12 quantity",{exact:true})).toHaveAttribute("aria-invalid","true");
  await page.getByLabel("Remove Ingredient 6",{exact:true}).click();
  await expect(page.getByLabel("Ingredient 6 Item",{exact:true})).toBeFocused();
  await expect(page.getByLabel("Ingredient 11 quantity",{exact:true})).toHaveValue("0.");
  await expect(page.getByLabel("Ingredient 11 quantity",{exact:true})).toHaveAttribute("aria-invalid","true");
  for (const width of [900,320]) {
    await page.setViewportSize({width,height:480});
    await expect(page.getByLabel("Ingredient 11 quantity",{exact:true})).toHaveValue("0.");
    const actions = await page.locator('[data-recipe-editor-actions]').boundingBox();
    expect(actions!.y + actions!.height).toBeLessThanOrEqual(481);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByLabel("Ingredient 11 quantity",{exact:true}).fill("0.2500");
  await page.screenshot({path:test.info().outputPath("recipe-editor-last-line-320.png"),fullPage:true});
  await page.getByRole("button",{name:"Save Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Long Recipe ingredient inspection",exact:true})).toBeVisible({timeout:30_000});
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try { expect(db.prepare("SELECT COUNT(*) AS count FROM recipe_ingredient WHERE recipeId='e2e-long-recipe'").get()).toEqual({count:11}); }
  finally { db.close(); }
});

test("guards same tab links, native unload and reverted Recipe values without losing errors", async ({ page, context }) => {
  test.setTimeout(90_000);
  await admin(page);
  await page.goto("/recipes/new");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Recipe name").fill("raw dirty");
  await page.getByLabel("Ingredient 1 quantity",{exact:true}).fill("0.");
  await page.getByRole("button",{name:"Create Recipe",exact:true}).click();
  await expect(page.getByText("Could not save Recipe",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Items",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Keep editing"}).click();
  await expect(page.getByLabel("Ingredient 1 quantity",{exact:true})).toHaveValue("0.");
  await expect(page.getByLabel("Ingredient 1 quantity",{exact:true})).toHaveAttribute("aria-invalid","true");
  await page.setViewportSize({width:320,height:600});
  await page.getByLabel("Recipe name").scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath("recipe-new-errors-320.png"),fullPage:true});
  let nativeWarning = false;
  page.once("dialog", async dialog => { nativeWarning = dialog.type() === "beforeunload"; await dialog.dismiss(); });
  await page.reload({timeout:3000}).catch(() => {});
  expect(nativeWarning).toBe(true);
  await expect(page.getByLabel("Recipe name")).toHaveValue("raw dirty");
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("link",{name:"Recipes",exact:true}).last().click({modifiers:["Control"]});
  const popup = await popupPromise;
  await popup.close();
  await expect(page.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toHaveCount(0);
  await page.getByLabel("Recipe name").fill("");
  await page.getByLabel("Ingredient 1 quantity",{exact:true}).fill("");
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Recipes",exact:true})).toBeVisible();
});



test("blocks app exits during a pending Recipe save and restores raw values after transport failure", async ({page}) => {
  test.setTimeout(90_000);
  await admin(page);
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByRole("link",{name:"Create Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"New Recipe",exact:true})).toBeVisible({timeout:30_000});
  await page.getByLabel("Recipe name").fill("Pending raw recipe");
  let release: (() => void) | undefined;
  await page.route("**/*", async route => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      await new Promise<void>(resolve => {release=resolve;});
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button",{name:"Create Recipe",exact:true}).click();
  await expect(page.getByRole("button",{name:/Saving/})).toBeDisabled();
  await page.getByRole("link",{name:"Recipes",exact:true}).last().click();
  await page.evaluate(() => history.back());
  await expect(page.getByRole("heading",{name:"New Recipe",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toHaveCount(0);
  await expect.poll(() => Boolean(release)).toBe(true);
  release!();
  await expect(page.getByText("The Recipe could not be saved. Check your connection and try again.",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Recipe name")).toHaveValue("Pending raw recipe");
  await expect(page.getByRole("button",{name:"Create Recipe",exact:true})).toBeEnabled();
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Keep editing"}).click();
});


test("retains unavailable Recipe references visibly until the user selects a replacement", async ({page}) => {
  test.setTimeout(90_000);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("INSERT INTO recipe(id,name,normalizedName,isActive,baselinePax,createdAt,updatedAt) VALUES ('e2e-unavailable-recipe','Unavailable reference Recipe','unavailable reference recipe',1,50,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
    db.prepare("INSERT INTO item(reorderLevel,id,name,normalizedName,categoryId,baseUnitId,isActive,createdAt,updatedAt) VALUES ('0','e2e-unavailable-item','Unavailable ingredient','unavailable ingredient','default-category-staples-dry-goods','default-unit-kilogram',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
    db.prepare("INSERT INTO recipe_ingredient(id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-unavailable-ingredient','e2e-unavailable-recipe','e2e-unavailable-item','0.125',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
  } finally { db.close(); }
  await admin(page);
  await page.setViewportSize({width:320,height:600});
  await page.goto("/recipes/e2e-unavailable-recipe");
  await expect(page.getByRole("heading",{name:"Unavailable reference Recipe",exact:true})).toBeVisible();
  await expect(page.getByText("Unavailable ingredients",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Edit Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Edit Recipe",exact:true})).toBeVisible({timeout:30_000});
  await expect(page.getByLabel("Ingredient 1 Item",{exact:true})).toHaveValue("Unavailable ingredient (unavailable)");
  await expect(page.getByLabel("Ingredient 1 quantity",{exact:true})).toHaveValue("0.125");
  await expect(page.getByText("This Item or Unit is inactive. Select an available Item and Unit before saving.",{exact:true})).toBeVisible();
  await page.getByLabel("Ingredient 1 quantity",{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath("recipe-editor-unavailable-320.png"),fullPage:true});
});


test("retains owned Back protection after reloading a pristine Recipe editor", async ({page}) => {
  test.setTimeout(90_000);
  await admin(page);
  await page.goto("/recipes");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByRole("link",{name:"Create Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"New Recipe",exact:true})).toBeVisible({timeout:30_000});
  await page.reload();
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Recipe name").fill("Dirty after reload");
  await page.evaluate(() => history.back());
  await expect(page.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Keep editing"}).click();
  await expect(page.getByLabel("Recipe name")).toHaveValue("Dirty after reload");
  await page.evaluate(() => history.back());
  await page.getByRole("button",{name:"Discard changes"}).click();
  await expect(page.getByRole("heading",{name:"Recipes",exact:true})).toBeVisible();
});

test("leaves a truly unindexed same-document entry to the browser without rewriting its destination or Forward", async ({page}) => {
  test.setTimeout(90_000);
  await admin(page);
  await page.goto("/recipes?recipesSearch=Chicken");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  // Simulate a pre-owner entry; browser API bypasses the installed index wrapper.
  await page.evaluate(() => {
    const state = {...history.state};
    delete state.masanaoNavigation;
    History.prototype.replaceState.call(history,state,"");
  });
  await page.getByRole("link",{name:"Create Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"New Recipe",exact:true})).toBeVisible({timeout:30_000});
  await page.getByLabel("Recipe name").fill("Unindexed fallback");
  await page.evaluate(() => history.back());
  await expect(page.getByLabel("Search Recipes")).toHaveValue("Chicken");
  await expect(page).toHaveURL(/\/recipes\?recipesSearch=Chicken$/);
  await page.evaluate(() => history.forward());
  await expect(page.getByRole("heading",{name:"New Recipe",exact:true})).toBeVisible({timeout:30_000});
});

test("keeps Recipe first and last fields reachable at enlarged text on a short screen", async ({page}) => {
  test.setTimeout(90_000);
  await admin(page);
  await page.setViewportSize({width:320,height:480});
  await page.goto("/recipes/e2e-long-recipe/edit");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.evaluate(() => document.documentElement.style.fontSize="200%");
  await page.getByLabel("Recipe name").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Recipe name")).toBeInViewport();
  await page.screenshot({path:test.info().outputPath("recipe-editor-first-200.png"),fullPage:true});
  const quantity = page.getByLabel(/^Ingredient \d+ quantity$/).last();
  await quantity.scrollIntoViewIfNeeded();
  await expect(quantity).toBeInViewport();
  const inputBox = (await quantity.boundingBox())!;
  const bodyBox = (await page.locator('[data-recipe-editor-body]').boundingBox())!;
  expect(inputBox.y).toBeGreaterThanOrEqual(bodyBox.y);
  expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(bodyBox.y + bodyBox.height + 1);
  for (const name of ["Cancel","Save Recipe"]) {
    const box = await page.getByRole("button",{name,exact:true}).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(40);
    expect(box!.y + box!.height).toBeLessThanOrEqual(481);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath("recipe-editor-last-200.png"),fullPage:true});
});

