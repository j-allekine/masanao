import { expect, test, type Locator } from "@playwright/test";
import Database from "better-sqlite3";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

const meal = "/activity-designs/e2e-issuance-portal-design/activities/e2e-issuance-portal-activity/meal-schedules/e2e-issuance-portal-meal";
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec(`INSERT INTO activity_design(id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-issuance-portal-design','AD-PORTAL',2026,'Portal training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-issuance-portal-activity','e2e-issuance-portal-design','Portal activity','Kitchen',CURRENT_TIMESTAMP,50,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-issuance-portal-meal','e2e-issuance-portal-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO recipe(id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('e2e-issuance-portal-recipe','Portal Rice','portal rice',50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO recipe_ingredient(id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-issuance-portal-ingredient','e2e-issuance-portal-recipe','e2e-recipe-item-rice','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
    db.exec("INSERT INTO recipe(id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('e2e-issuance-portal-recipe-large','Portal Rice large','portal rice large',50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP); INSERT INTO recipe_ingredient(id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-issuance-portal-ingredient-large','e2e-issuance-portal-recipe-large','e2e-recipe-item-rice','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);");
  } finally { db.close(); }
});
test.afterAll(cleanupIssuanceFixtures);

async function reachable(control: Locator) {
  await expect(control).toBeEnabled();
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  const bounds = await control.evaluate(element => ({ height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width, fits: element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight }));
  console.log("Portal action",await control.getAttribute("aria-label") ?? await control.innerText(),bounds);
  expect(bounds.height).toBeGreaterThanOrEqual(40);
  expect(bounds.width).toBeGreaterThanOrEqual(40);
  expect(bounds.fits).toBe(true);
}

test("Draft portal actions fit and remain reachable at 320x480 and 200 percent text", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", {data:{username:"kitchen.staff",password:"correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await page.goto(meal);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30_000});
  for (const target of [680,688]) {
    let viewport=900;
    await page.setViewportSize({width:viewport,height:700});
    await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished));});
    const pane=page.locator('[data-issuance-ready="true"] [data-workspace-scroll="body"]');
    for(let attempt=0;attempt<3;attempt++) {
      const actual=await pane.evaluate(element=>element.clientWidth);
      if(actual===target) break;
      viewport+=target-actual;
      await page.setViewportSize({width:Math.round(viewport),height:700});
      await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished));});
    }
    const geometry=await pane.evaluate(element=>{
      const content=element.querySelector('.workspace-content')!;
      const style=getComputedStyle(content);
      return {pane:element.clientWidth,inner:content.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),gutter:parseFloat(style.paddingLeft)};
    });
    expect(geometry).toEqual({pane:target,inner:target-48,gutter:24});
    console.log("Meal width owners",geometry);
  }
  await page.setViewportSize({width:320,height:480});
  for (const enlarged of [false,true]) {
    await page.evaluate(value => { document.documentElement.style.fontSize = value ? "200%" : ""; }, enlarged);
    await page.getByRole("button",{name:"Add Stock item",exact:true}).click();
    const stock = page.getByRole("dialog",{name:"Add Stock item",exact:true});
    await expect(stock.getByRole("heading",{name:"Add Stock item",exact:true})).toBeFocused();
    await stock.getByRole("combobox",{name:"Item",exact:true}).fill("Rice");
    await page.getByRole("option",{name:"Rice",exact:true}).click();
    await stock.getByLabel("Quantity",{exact:true}).fill("0.25");
    await reachable(stock.getByRole("button",{name:"Clear Stock selection",exact:true}));
    await reachable(stock.getByRole("button",{name:"Add Stock item",exact:true}));
    await reachable(stock.getByRole("button",{name:"Cancel",exact:true}));
    await page.screenshot({path:info.outputPath(`stock-footer-${enlarged ? 200 : 100}.png`),fullPage:true});
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button",{name:"Add Stock item",exact:true})).toBeFocused();
    await page.getByLabel("Meal pax",{exact:true}).fill(enlarged ? "70" : "60");
    await page.getByRole("main").getByRole("button",{name:"Discard changes",exact:true}).click();
    const discard = page.getByRole("dialog",{name:"Discard unsaved changes?",exact:true});
    await expect(discard.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toBeFocused();
    await expect(discard.getByRole("heading",{name:"Discard unsaved changes?",exact:true})).toBeInViewport();
    for (const name of ["Keep editing","Discard changes"]) await reachable(discard.getByRole("button",{name,exact:true}));
    expect(await discard.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`discard-footer-${enlarged ? 200 : 100}.png`),fullPage:true});
    await discard.getByRole("button",{name:"Keep editing",exact:true}).click();
    await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue(enlarged ? "70" : "60");
    await page.getByRole("button",{name:"Add Recipes",exact:true}).click();
    const recipes=page.getByRole("dialog",{name:"Add Recipes",exact:true});
    const recipeName=enlarged ? "Portal Rice large" : "Portal Rice";
    await page.getByLabel("Search Recipes").fill(recipeName);
    await page.getByRole("checkbox",{name:recipeName,exact:true}).check();
    await reachable(recipes.getByRole("button",{name:`Remove selection ${recipeName}`,exact:true}));
    await reachable(recipes.getByRole("button",{name:"Add 1 Recipe",exact:true}));
    await recipes.getByRole("button",{name:"Add 1 Recipe",exact:true}).click();
    await expect(recipes.getByRole("heading",{name:`Already added (${enlarged ? 2 : 1})`,exact:true})).toBeVisible();
    await reachable(recipes.getByRole("button",{name:"Done",exact:true}));
    await recipes.getByRole("button",{name:"Done",exact:true}).click();
    await page.getByRole("button",{name:"Actions for Portal Rice",exact:true}).first().click();
    await page.getByRole("menuitem",{name:"Adjust target pax",exact:true}).click();
    const target=page.getByRole("dialog",{name:"Adjust target pax",exact:true});
    await reachable(target.getByRole("button",{name:"Use Meal pax",exact:true}));
    await reachable(target.getByRole("button",{name:"Apply target",exact:true}));
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Review quantities and stock",exact:true}).click();
    const review=page.getByRole("dialog",{name:"Combined quantities and stock",exact:true});
    await reachable(review.getByRole("button",{name:"Close review",exact:true}));
    await reachable(review.getByRole("button",{name:"Save draft",exact:true}));
    await review.getByRole("button",{name:"Close review",exact:true}).click();
    await page.getByRole("button",{name:"Post issuance",exact:true}).click();
    const post=page.getByRole("dialog",{name:"Post issuance?",exact:true});
    await reachable(post.getByRole("button",{name:"Confirm and post issuance",exact:true}));
    await reachable(post.getByRole("button",{name:"Keep draft",exact:true}));
    await page.screenshot({path:info.outputPath(`post-footer-${enlarged ? 200 : 100}.png`),fullPage:true});
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button",{name:"Post issuance",exact:true})).toBeFocused();
    // The next pass uses the existing saved baseline and adds a second contribution.
  }
});


test("discard Stay restores the actual footer opener",async({page})=>{
  test.setTimeout(90000);
  expect((await page.request.post("/api/auth/sign-in/username",{data:{username:"kitchen.staff",password:"correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await page.goto(meal.split('/meal-schedules/')[0]);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible({timeout:30000});
  await expect.poll(()=>page.evaluate(()=>Boolean(history.state?.masanaoNavigation))).toBe(true);
  const parentEntry=await page.evaluate(()=>history.state.masanaoNavigation as {session:string;index:number});
  await page.getByRole("link",{name:"Open Meal Schedule: Lunch",exact:true}).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30000});
  expect(await page.evaluate(()=>history.state.masanaoNavigation)).toEqual({...parentEntry,index:parentEntry.index+1});
  await page.setViewportSize({width:320,height:480});
  await page.getByLabel("Meal pax",{exact:true}).fill("65");
  const opener=page.getByRole("main").getByRole("button",{name:"Discard changes",exact:true});
  await opener.click();
  const dialog=page.getByRole("dialog",{name:"Discard unsaved changes?",exact:true});
  await dialog.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();await expect(opener).toBeInViewport();
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("65");
  await page.getByRole("button",{name:"Add Stock item",exact:true}).click();
  const stock=page.getByRole("dialog",{name:"Add Stock item",exact:true});
  for(let index=0;index<12;index++) {
    await stock.getByRole("combobox",{name:"Item",exact:true}).fill("Rice");
    await page.getByRole("option",{name:"Rice",exact:true}).click();
    await stock.getByLabel("Quantity",{exact:true}).fill("0.01");
    await stock.getByRole("button",{name:"Add Stock item",exact:true}).click();
    await expect(stock.getByRole("heading",{name:`Stock already added (${index+1})`,exact:true})).toBeVisible();
  }
  await stock.getByRole("button",{name:"Done",exact:true}).click();
  const lastRow=page.getByRole("button",{name:"Actions for Stock item Rice",exact:true}).last();
  await lastRow.scrollIntoViewIfNeeded();await lastRow.focus();
  await page.evaluate(()=>history.back());await expect(dialog).toBeVisible();
  await dialog.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(dialog).toHaveCount(0);await expect(lastRow).toBeFocused();await expect(lastRow).toBeInViewport();
  await expect(page).toHaveURL(new RegExp(`${meal}$`));
});
