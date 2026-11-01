import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import type { IssuanceWorkspace } from "../../src/features/issuance/types";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

const meal="/activity-designs/e2e-post-view-design/activities/e2e-post-view-activity/meal-schedules/e2e-post-view-meal";
const itemName=`Saved eggs ${"unbroken".repeat(23)}`;
const recipeName=`Saved recipe ${"longword".repeat(23)}`;
const unit="U".repeat(30);
// Presentation-only saved evidence complements the real posting/FIFO journeys.
const evidence: IssuanceWorkspace = {
  context:{activityDesignId:"e2e-post-view-design",activityId:"e2e-post-view-activity",mealScheduleId:"e2e-post-view-meal",activityDesignNo:"AD-SAVED",activityDesignTitle:"Saved design",activityName:"Saved activity",mealLabel:"Saved lunch",mealTime:"12:00",plannedPax:1},
  draft:{id:"e2e-post-view-record",revision:2,status:"posted",mealPax:1,stockItems:[],recipes:[{id:"e2e-post-view-snapshot",recipeId:"unavailable-recipe",recipeName,sourceRevision:"saved",baselinePax:2,targetMode:"meal",targetPax:1,ingredients:Array.from({length:12},(_,index)=>({id:`saved-ingredient-${index}`,itemId:"unavailable-item",itemName,enteredQuantity:index===11 ? "4" : "3",conversionFactor:"1",selectedUnitId:"default-unit-piece",selectedUnitName:"Saved piece",selectedUnitAbbreviation:unit,baseUnitId:"default-unit-piece",baseUnitName:"Saved piece",baseUnitAbbreviation:unit,postedContribution:{quantity:index===11 ? "2" : "1.5",approximate:false,numerator:index===11 ? "2" : "3",denominator:index===11 ? "1" : "2"}}))}]},
  review:[{itemId:"unavailable-item",itemName,baseUnitId:"default-unit-piece",baseUnitName:"Saved piece",baseUnitAbbreviation:unit,calculatedNumerator:"37",calculatedDenominator:"2",calculatedQuantity:"18.5",calculatedApproximate:false,automaticQuantity:"18.5",finalQuantity:"19",adjusted:true,policy:"whole-only",warning:null,availableQuantity:"0",shortage:false,receiptAllocations:[{receiptLineId:"unavailable-receipt-1",quantity:"10",receiptNo:"Saved receipt 1",purchaseOrderNo:"Saved PO 1",receiptDate:"2026-10-01T00:00:00.000Z",basis:"fifo"},{receiptLineId:"unavailable-receipt-2",quantity:"9",receiptNo:"Saved receipt 2",purchaseOrderNo:"Saved PO 2",receiptDate:"2026-10-02T00:00:00.000Z",basis:"reconstructed"}]}],
  reviewPending:false,reviewReferences:[],posted:{postedAt:"2026-10-20T04:00:00.000Z",actorId:"former-actor",actorName:"Saved Kitchen Staff",actorUsername:"former.staff"},
};
test.beforeAll(()=>{
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.exec(`INSERT INTO activity_design(id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-post-view-design','AD-CURRENT',2026,'Current design',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO activity(id,activityDesignId,name,officeName,venue,scheduledDate,createdAt,updatedAt) VALUES ('e2e-post-view-activity','e2e-post-view-design','Current activity','Current Office','Current venue',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-post-view-meal','e2e-post-view-activity','Current meal','13:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`);
    db.prepare("INSERT INTO issuance_record(id,mealScheduleId,mealPax,status,postingEvidence,postedAt,createdAt,updatedAt) VALUES ('e2e-post-view-record','e2e-post-view-meal',1,'posted',?,'2026-10-20T04:00:00.000Z',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(JSON.stringify(evidence));
  } finally {db.close();}
});
test.afterAll(cleanupIssuanceFixtures);

for(const actor of ["staff","admin"] as const) test(`posted saved results and unavailable sources remain read-only and reachable for ${actor}`,async({page},info)=>{
  test.setTimeout(120000);
  expect((await page.request.post("/api/auth/sign-in/username",{data:{username:actor==="staff" ? "kitchen.staff" : "municipal.admin",password:actor==="staff" ? "correct-horse-battery-staple" : "administrator-password"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await page.goto(`${meal}/issuance`);
  await expect(page).toHaveURL(new RegExp(`${meal}$`));
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30000});
  for (const target of [680,688]) {
    let viewport=900;
    await page.setViewportSize({width:viewport,height:700});
    await page.evaluate(async()=>{await Promise.allSettled(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished));});
    const pane=page.locator('[data-issuance-ready="true"] [data-workspace-scroll="body"]');
    for(let attempt=0;attempt<3;attempt++) {
      const actual=await pane.evaluate(element=>element.clientWidth);
      if(actual===target) break;
      viewport+=target-actual;
      await page.setViewportSize({width:Math.round(viewport),height:700});
      await page.evaluate(async()=>{await Promise.allSettled(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished));});
    }
    const geometry=await pane.evaluate(element=>{
      const content=element.querySelector('.workspace-content')!;
      const style=getComputedStyle(content);
      return {pane:element.clientWidth,inner:content.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),gutter:parseFloat(style.paddingLeft)};
    });
    expect(geometry).toEqual({pane:target,inner:target-48,gutter:24});
    console.log("Meal width owners",geometry);
  }
  const results=page.getByRole("list",{name:"Saved issued quantities",exact:true});
  await expect(results).toContainText(`19 ${unit}`);
  await expect(results).toContainText(`Calculated: 18.5 ${unit}`);
  await expect(page.getByRole("button",{name:/^(Save draft|Post issuance|Add Recipes|Add Stock item|Discard changes)$/})).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"Saved lunch · 12:00",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Current planning details",exact:true}).click();
  await expect(page.getByText("Current Office",{exact:true}).last()).toBeVisible();
  await expect(page.getByText(/Live planning values/)).toBeVisible();
  await page.getByRole("button",{name:"Current planning details",exact:true}).click();
  for(const [width,height,enlarged] of [[1280,800,false],[768,600,false],[320,480,false],[320,480,true]] as const){
    await page.setViewportSize({width,height});
    await page.evaluate(value=>{document.documentElement.style.fontSize=value ? "200%" : "";},enlarged);
    if(width===768){ await page.locator("header").getByRole("button",{name:"Toggle Sidebar",exact:true}).click(); }
    await page.evaluate(async()=>{await Promise.allSettled(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished));});
    await results.scrollIntoViewIfNeeded();
    expect(await page.locator('[data-issuance-ready="true"] [data-workspace-scroll="body"]').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`results-${width}-${enlarged ? 200 : 100}.png`),fullPage:true});
    const totalsButton=page.getByRole("button",{name:"View issued totals",exact:true});
    await totalsButton.click();
    const totals=page.getByRole("dialog",{name:"Issued item totals",exact:true});
    await expect(totals.getByRole("heading",{name:"Issued item totals",exact:true})).toBeFocused();
    expect(await totals.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`totals-${width}-${enlarged ? 200 : 100}.png`),fullPage:true});
    const breakdown=totals.getByRole("button",{name:`View breakdown for ${itemName}`,exact:true});
    await breakdown.focus();await page.keyboard.press("Enter");
    const sources=page.getByRole("dialog",{name:`Details for ${itemName}`,exact:true});
    await expect(sources.getByRole("heading",{name:`Details for ${itemName}`,exact:true})).toBeFocused();
    await expect(sources.getByText("Recorded receipt source",{exact:true}).filter({visible:true})).toHaveCount(1);
    await expect(sources.getByText("Historical source reconstructed",{exact:true}).filter({visible:true})).toHaveCount(1);
    await sources.getByText(/These allocations do not deduct stock again/).scrollIntoViewIfNeeded();
    await sources.getByRole("button",{name:"Calculation details",exact:true}).click();
    await expect(sources.getByText("Whole quantities only",{exact:true})).toBeVisible();
    expect(await sources.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`sources-${width}-${enlarged ? 200 : 100}.png`),fullPage:true});
    await page.keyboard.press("Escape");await expect(sources).toHaveCount(0);await expect(breakdown).toBeFocused();await expect(totals).toBeVisible();
    const tooltip=page.getByRole("tooltip",{name:"View breakdown",exact:true});
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");await expect(tooltip).toHaveCount(0);await expect(totals).toBeVisible();
    await page.keyboard.press("Escape");await expect(totals).toHaveCount(0);await expect(totalsButton).toBeFocused();
    const recipe=page.getByRole("button",{name:`View ingredients for ${recipeName}`,exact:true});
    await recipe.click();
    const ingredients=page.getByRole("dialog",{name:recipeName,exact:true});
    await expect(ingredients.getByRole("heading",{name:recipeName,exact:true})).toBeFocused();
    await expect(ingredients.getByRole("row")).toHaveCount(13);
    await ingredients.getByRole("row").last().scrollIntoViewIfNeeded();
    await expect(ingredients.getByRole("row").last()).toBeInViewport();
    expect(await ingredients.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`ingredients-${width}-${enlarged ? 200 : 100}.png`),fullPage:true});
    await page.keyboard.press("Escape");await expect(recipe).toBeFocused();
  }
  await page.context().clearCookies();
  page.once("dialog",dialog=>dialog.accept());
  await page.goto(meal);await expect(page.getByLabel("Username",{exact:true})).toBeVisible();
});


test("failed posted reads recover through Retry and current role is rechecked",async({page},info)=>{
  test.setTimeout(90000);
  expect((await page.request.post("/api/auth/sign-in/username",{data:{username:"kitchen.staff",password:"correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("UPDATE issuance_record SET postingEvidence='unavailable' WHERE id='e2e-post-view-record'").run();
    await page.setViewportSize({width:320,height:480});await page.goto(meal);
    await expect(page.getByRole("heading",{level:1,name:/Unable to load/})).toBeVisible({timeout:30000});
    await expect(page.getByRole("main")).toHaveCount(1);
    await page.screenshot({path:info.outputPath("posted-read-error-320.png"),fullPage:true});
    db.prepare("UPDATE issuance_record SET postingEvidence=? WHERE id='e2e-post-view-record'").run(JSON.stringify(evidence));
    await page.getByRole("button",{name:"Retry",exact:true}).click();
    await expect(page.getByRole("list",{name:"Saved issued quantities",exact:true})).toContainText(`19 ${unit}`);
    db.prepare("UPDATE user SET role='observer' WHERE username='kitchen.staff'").run();await page.reload();
    await expect(page.getByText("Issuance is available to kitchen staff and administrators.",{exact:true})).toBeVisible();
    await expect(page.getByRole("list",{name:"Saved issued quantities",exact:true})).toHaveCount(0);
    db.prepare("UPDATE user SET role='staff' WHERE username='kitchen.staff'").run();await page.reload();
    await expect(page.getByRole("list",{name:"Saved issued quantities",exact:true})).toContainText(`19 ${unit}`);
  } finally {
    db.prepare("UPDATE issuance_record SET postingEvidence=? WHERE id='e2e-post-view-record'").run(JSON.stringify(evidence));
    db.prepare("UPDATE user SET role='staff' WHERE username='kitchen.staff'").run();db.close();
  }
});
