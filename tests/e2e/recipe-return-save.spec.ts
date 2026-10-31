import { expect, test } from "@playwright/test";

test("preserves validated Recipe catalog context after create and edit save", async ({page}) => {
  test.setTimeout(90_000);
  expect((await page.request.post("/api/auth/sign-in/username", {data:{username:"municipal.admin",password:"administrator-password"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  const catalog="/recipes?recipesSearch=Chicken";
  await page.goto(`/recipes/new?${new URLSearchParams({returnTo:catalog})}`);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.getByLabel("Recipe name").fill("Context save Recipe");
  await page.getByLabel("Recipe Baseline Pax").fill("50");
  const item=page.getByLabel("Ingredient 1 Item",{exact:true});
  await item.click(); await item.pressSequentially("Rice"); await item.press("ArrowDown"); await item.press("Enter");
  await page.getByLabel("Ingredient 1 quantity",{exact:true}).fill("0.125");
  await page.getByRole("button",{name:"Create Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Context save Recipe",exact:true})).toBeVisible({timeout:30_000});
  await expect(page).toHaveURL(/returnTo=%2Frecipes%3FrecipesSearch%3DChicken$/);
  await page.getByRole("link",{name:"Edit Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Edit Recipe",exact:true})).toBeVisible();
  await page.getByLabel("Preparation note").fill("Saved with context");
  await page.getByRole("button",{name:"Save Recipe",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Context save Recipe",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toHaveCount(0);
  await page.getByRole("link",{name:"Recipes",exact:true}).last().click();
  await expect(page.getByLabel("Search Recipes")).toHaveValue("Chicken");
  await page.goto(`/recipes/new?${new URLSearchParams({returnTo:"https://evil.test/recipes"})}`);
  await expect(page.getByRole("heading",{name:"New Recipe",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(page).toHaveURL(/\/recipes$/);
});
