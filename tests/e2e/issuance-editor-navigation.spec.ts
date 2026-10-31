import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

test.setTimeout(90_000);

const activity = "/activity-designs/e2e-issuance-282-design/activities/e2e-issuance-282-activity";
const meal = (name: string) => `${activity}/meal-schedules/e2e-issuance-282-${name}`;
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec(`INSERT INTO activity_design(id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-issuance-282-design','AD-282',2026,'Draft guard training',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-issuance-282-activity','e2e-issuance-282-design','Draft guard activity','Kitchen',CURRENT_TIMESTAMP,50,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
    db.exec(`INSERT INTO recipe(id,name,normalizedName,baselinePax,isActive,createdAt,updatedAt) VALUES ('e2e-issuance-282-recipe','Baseline Rice 282','baseline rice 282',50,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO recipe_ingredient(id,recipeId,itemId,enteredQuantity,createdAt,updatedAt) VALUES ('e2e-issuance-282-ingredient','e2e-issuance-282-recipe','e2e-recipe-item-rice','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
    for (const name of ["history","baseline","failure","long","role","rapid"]) db.prepare("INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,'e2e-issuance-282-activity',?,'12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-issuance-282-${name}`,name);
  } finally { db.close(); }
});
test.afterAll(cleanupIssuanceFixtures);
async function open(page:Page,name:string) {
  expect((await page.request.post("/api/auth/sign-in/username", {data:{username:"kitchen.staff",password:"correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await page.goto(activity);
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible({timeout:30_000});
  await page.getByRole("link",{name:`Open Meal Schedule: ${name}`,exact:true}).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30_000});
}
async function stock(page:Page,quantity:string) {
  await page.getByRole("button",{name:"Add Stock item",exact:true}).click();
  const picker=page.getByRole("dialog",{name:"Add Stock item",exact:true});
  await picker.getByRole("combobox",{name:"Item",exact:true}).fill("Rice");
  await page.getByRole("option",{name:"Rice",exact:true}).click();
  await picker.getByLabel("Quantity",{exact:true}).fill(quantity);
  await picker.getByRole("button",{name:"Add Stock item",exact:true}).click();
  await expect(picker.getByRole("status")).toContainText("added to stock");
  await picker.getByRole("button",{name:"Done",exact:true}).click();
}
const discard=(page:Page)=>page.getByRole("dialog",{name:"Discard unsaved changes?",exact:true});

test("Meal dirty Back Stay Discard preserves real history Forward and native new-tab behavior",async({page,context})=>{
  await open(page,"history");
  await page.getByRole("link",{name:"Recipes",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Recipes",exact:true})).toBeVisible();
  await page.evaluate(()=>history.back());
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30_000});
  await page.getByLabel("Meal pax",{exact:true}).fill("0");
  await page.evaluate(()=>history.forward());
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole("button",{name:"Keep editing"}).click();
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("0");
  await page.evaluate(()=>history.back());
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole("button",{name:"Keep editing"}).click();
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("0");
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveAttribute("aria-invalid","true");
  const popupPromise=context.waitForEvent("page");
  await page.getByRole("link",{name:"Draft guard activity",exact:true}).click({modifiers:["Control"]});
  const popup=await popupPromise; await popup.close();
  await expect(discard(page)).toHaveCount(0);
  await page.getByRole("link",{name:"Draft guard activity",exact:true}).click();
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole("button",{name:"Keep editing"}).click();
  let native=false; page.once("dialog",async dialog=>{native=dialog.type()==="beforeunload";await dialog.dismiss();});
  await page.reload({timeout:3000}).catch(()=>{}); expect(native).toBe(true);
  await page.evaluate(()=>history.back());
  await discard(page).getByRole("button",{name:"Discard changes",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`${activity}$`));
  await page.evaluate(()=>history.forward());
  await expect(page).toHaveURL(new RegExp(`${meal("history")}$`));
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("50");
});

test("draft save establishes a baseline and later edits regain guards while reverted values are clean",async({page})=>{
  await open(page,"baseline");
  await page.getByLabel("Meal pax",{exact:true}).fill("50");
  await stock(page,"0.2500");
  await page.getByRole("button",{name:"Add Recipes",exact:true}).click();
  await page.getByLabel("Search Recipes").fill("Baseline Rice 282");
  await page.getByRole("checkbox",{name:"Baseline Rice 282",exact:true}).check();
  await page.getByRole("button",{name:"Add 1 Recipe",exact:true}).click();
  const recipePicker=page.getByRole("dialog",{name:"Add Recipes",exact:true});
  await expect(recipePicker.getByRole("heading",{name:/Already added/})).toBeVisible();
  await recipePicker.getByRole("button",{name:"Done",exact:true}).click();
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await page.getByLabel("Meal pax",{exact:true}).fill("60");
  await page.getByRole("link",{name:"Draft guard activity",exact:true}).click();
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole("button",{name:"Keep editing"}).click();
  await page.getByLabel("Meal pax",{exact:true}).fill("50");
  await expect(page.getByRole("button",{name:"Save draft",exact:true})).toBeDisabled();
  await page.getByLabel("Meal pax",{exact:true}).fill("70");
  await page.getByRole("main").getByRole("button",{name:"Discard changes",exact:true}).click();
  await discard(page).getByRole("button",{name:"Discard changes",exact:true}).click();
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("50");
  await page.getByLabel("Meal pax",{exact:true}).fill("60");
  await page.getByRole("link",{name:"Draft guard activity",exact:true}).click();
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole("button",{name:"Keep editing"}).click();
  await page.getByLabel("Meal pax",{exact:true}).fill("50");
  await page.getByRole("link",{name:"Draft guard activity",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`${activity}$`));
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {expect(db.prepare("SELECT mealPax FROM issuance_record WHERE mealScheduleId='e2e-issuance-282-baseline'").get()).toEqual({mealPax:50});expect(db.prepare("SELECT COUNT(*) AS count FROM inventory_ledger_movement WHERE movementType='stock-out'").get()).toEqual({count:0});} finally{db.close();}
});

test("pending draft blocks app exits and duplicate saves; transport failure preserves work and retry",async({page})=>{
  await open(page,"failure");
  await page.getByRole("link",{name:"AD-282",exact:true}).click();
  await page.getByRole("link",{name:"Open Activity: Draft guard activity",exact:true}).click();
  await page.getByRole("link",{name:"Open Meal Schedule: failure",exact:true}).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30_000});
  await page.getByLabel("Meal pax",{exact:true}).fill("0050");await stock(page,"0.123456789123456789");
  let release!:()=>void; let count=0;
  await page.route("**/*",async route=>{if(route.request().method()==="POST"&&route.request().headers()["next-action"]){count++;await new Promise<void>(resolve=>{release=resolve;});await route.abort("failed");}else await route.continue();});
  await page.getByRole("button",{name:"Save draft",exact:true}).click();
  await expect(page.getByRole("button",{name:"Working…",exact:true})).toBeDisabled();
  await page.getByRole("link",{name:"Draft guard activity",exact:true}).click();
  await page.evaluate(()=>{history.back();history.back();});
  await expect(page).toHaveURL(new RegExp(`${meal("failure")}$`));await expect(discard(page)).toHaveCount(0);
  await expect.poll(()=>Boolean(release)).toBe(true);expect(count).toBe(1);release();
  await expect(page.getByText("The draft could not be saved. Check your connection and try again.",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("0050");
  await expect(page.getByText("0.123456789123456789 kg",{exact:true})).toBeVisible();
  await page.unroute("**/*");await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByRole("status")).toContainText("Draft saved");
});

test("short-screen Stock picker starts at its identity and all twelve contributions save with reachable actions",async({page},info)=>{
  test.setTimeout(120000);await open(page,"long");await page.setViewportSize({width:320,height:480});
  await page.getByLabel("Meal pax",{exact:true}).fill("50");
  await page.getByRole("button",{name:"Add Stock item",exact:true}).click();
  const picker=page.getByRole("dialog",{name:"Add Stock item",exact:true});
  await expect(picker.getByRole("heading",{name:"Add Stock item",exact:true})).toBeFocused();
  await expect(picker.getByRole("heading",{name:"Add Stock item",exact:true})).toBeInViewport();
  await page.screenshot({path:info.outputPath("stock-initial-320x480.png"),fullPage:true});
  for(let index=0;index<12;index++){
    await picker.getByRole("combobox",{name:"Item",exact:true}).fill("Rice");await page.getByRole("option",{name:"Rice",exact:true}).click();
    await picker.getByLabel("Quantity",{exact:true}).fill(`0.${index+1}00`);
    await picker.getByRole("button",{name:"Add Stock item",exact:true}).click();
    await expect(picker.getByRole("heading",{name:`Stock already added (${index+1})`,exact:true})).toBeVisible();
  }
  await picker.getByRole("button",{name:"Done",exact:true}).click();await expect(page.getByRole("button",{name:"Add Stock item",exact:true})).toBeFocused();
  for(const [width,height] of [[320,480],[768,600],[1024,600]]){
    await page.setViewportSize({width,height});await expect(page.getByRole("button",{name:"Post issuance",exact:true})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`draft-12-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:320,height:480});await page.evaluate(()=>document.documentElement.style.fontSize="200%");
  await page.getByLabel("Meal pax",{exact:true}).scrollIntoViewIfNeeded();await expect(page.getByLabel("Meal pax",{exact:true})).toBeInViewport();
  await page.screenshot({path:info.outputPath("draft-first-200.png"),fullPage:true});
  await page.getByRole("main").getByRole("button",{name:"Discard changes",exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole("main").getByRole("button",{name:"Discard changes",exact:true})).toBeInViewport();
  await page.screenshot({path:info.outputPath("draft-last-200.png"),fullPage:true});
  await page.evaluate(()=>document.documentElement.style.fontSize="");
  await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByRole("status")).toContainText("Draft saved");
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);try{expect(db.prepare("SELECT COUNT(*) AS count FROM issuance_stock_item s JOIN issuance_record r ON r.id=s.issuanceRecordId WHERE r.mealScheduleId='e2e-issuance-282-long'").get()).toEqual({count:12});}finally{db.close();}
});

test("a delayed draft save rechecks current role and session before writing",async({page})=>{
  test.setTimeout(90000);await open(page,"role");await stock(page,"0.25");
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  let release!:()=>void;
  try {
    await page.route("**/*",async route=>{if(route.request().method()==="POST"&&route.request().headers()["next-action"]){await new Promise<void>(resolve=>{release=resolve;});await route.continue();}else await route.continue();});
    await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect.poll(()=>Boolean(release)).toBe(true);
    db.prepare("UPDATE user SET role='observer' WHERE username='kitchen.staff'").run();release();
    await expect(page.getByRole("alert").filter({hasText:"Sign in as kitchen staff or an administrator to prepare issuance."})).toBeVisible();
    await expect(page.getByText("0.25 kg",{exact:true})).toBeVisible();
    expect(db.prepare("SELECT COUNT(*) AS count FROM issuance_record WHERE mealScheduleId='e2e-issuance-282-role'").get()).toEqual({count:0});
    db.prepare("UPDATE user SET role='staff' WHERE username='kitchen.staff'").run();await page.unroute("**/*");
    await page.getByRole("button",{name:"Save draft",exact:true}).click();await expect(page.getByRole("status")).toContainText("Draft saved");
    await page.getByLabel("Meal pax",{exact:true}).fill("60");
    await page.context().clearCookies();await page.getByRole("button",{name:"Save draft",exact:true}).click();
    await expect(page.getByRole("alert").filter({hasText:"Sign in as kitchen staff or an administrator to prepare issuance."})).toBeVisible();
    await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("60");
    expect(db.prepare("SELECT mealPax FROM issuance_record WHERE mealScheduleId='e2e-issuance-282-role'").get()).toEqual({mealPax:50});
    // The explicit sign-in destination remains browser/auth owned even with edits.
    page.once("dialog",async dialog=>{await dialog.accept();});
    await page.goto("/");await expect(page.getByLabel("Username",{exact:true})).toBeVisible();
  }finally{db.prepare("UPDATE user SET role='staff' WHERE username='kitchen.staff'").run();db.close();}
});


test("repeated Back while a dirty Meal guard is active preserves work",async({page})=>{
  test.setTimeout(90000);await open(page,"rapid");
  await page.getByRole("link",{name:"AD-282",exact:true}).click();
  await page.getByRole("link",{name:"Open Activity: Draft guard activity",exact:true}).click();
  await page.getByRole("link",{name:"Open Meal Schedule: rapid",exact:true}).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30_000});
  await page.getByLabel("Meal pax",{exact:true}).fill("60");
  await page.evaluate(()=>{history.back();history.back();});
  await expect(discard(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${meal("rapid")}$`));
  await page.evaluate(()=>{history.back();history.back();});
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`${meal("rapid")}$`));
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("60");
});
