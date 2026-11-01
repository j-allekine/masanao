import { expect, test, type Locator } from "@playwright/test";
import Database from "better-sqlite3";
import type { IssuanceWorkspace } from "../../src/features/issuance/types";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

const parent="/activity-designs/e2e-issuance-short-design/activities/e2e-issuance-short-activity";
const meal=(kind:string)=>`${parent}/meal-schedules/e2e-issuance-short-${kind}`;
test.beforeAll(()=>{
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try{
    db.exec(`INSERT INTO activity_design(id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-issuance-short-design','AD-SHORT',2026,'Short viewport training',0,0);
      INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-issuance-short-activity','e2e-issuance-short-design','Short viewport preparation','Kitchen',CURRENT_TIMESTAMP,50,0,0);
      INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-issuance-short-draft','e2e-issuance-short-activity','Draft lunch','12:00',0,0),('e2e-issuance-short-posted','e2e-issuance-short-activity','Posted lunch','13:00',0,0);
      INSERT INTO issuance_record(id,mealScheduleId,mealPax,revision,status,createdAt,updatedAt) VALUES ('e2e-issuance-short-draft-record','e2e-issuance-short-draft',50,1,'draft',0,0);`);
    for(let index=0;index<12;index++) db.prepare("INSERT INTO issuance_stock_item(id,issuanceRecordId,itemId,itemName,enteredQuantity,conversionFactor,selectedUnitId,selectedUnitName,selectedUnitAbbreviation,baseUnitId,baseUnitName,baseUnitAbbreviation) VALUES (?,'e2e-issuance-short-draft-record','e2e-recipe-item-rice','Rice','0.1','1','default-unit-kilogram','Kilogram','kg','default-unit-kilogram','Kilogram','kg')").run(`e2e-issuance-short-stock-${String(index).padStart(2,"0")}`);
    const evidence:IssuanceWorkspace={context:{activityDesignId:"e2e-issuance-short-design",activityId:"e2e-issuance-short-activity",mealScheduleId:"e2e-issuance-short-posted",activityDesignNo:"AD-SHORT",activityDesignTitle:"Short viewport training",activityName:"Short viewport preparation",mealLabel:"Posted lunch",mealTime:"13:00",plannedPax:50},draft:{id:"e2e-issuance-short-posted-record",revision:2,status:"posted",mealPax:50,recipes:[],stockItems:[]},review:[{itemId:"e2e-recipe-item-rice",itemName:"Rice",baseUnitId:"default-unit-kilogram",baseUnitName:"Kilogram",baseUnitAbbreviation:"kg",calculatedNumerator:"6",calculatedDenominator:"5",calculatedQuantity:"1.2",calculatedApproximate:false,automaticQuantity:"1.2",finalQuantity:"1.2",adjusted:false,policy:"allow-decimals",warning:null,availableQuantity:"0",shortage:false}],reviewPending:false,reviewReferences:[],posted:{postedAt:"2026-10-20T04:00:00.000Z",actorId:"e2e-staff-user",actorName:"Kitchen Staff",actorUsername:"kitchen.staff"}};
    db.prepare("INSERT INTO issuance_record(id,mealScheduleId,mealPax,revision,status,postingEvidence,postedAt,createdAt,updatedAt) VALUES ('e2e-issuance-short-posted-record','e2e-issuance-short-posted',50,2,'posted',?,'2026-10-20T04:00:00.000Z',0,0)").run(JSON.stringify(evidence));
  }finally{db.close();}
});
test.afterAll(cleanupIssuanceFixtures);
test.beforeEach(async({page})=>{
  expect((await page.request.post("/api/auth/sign-in/username",{data:{username:"kitchen.staff",password:"correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
});
async function fullyVisibleWithin(control:Locator,scroll:Locator){
  await control.scrollIntoViewIfNeeded();await control.focus();await expect(control).toBeInViewport({ratio:1});
  const bounds=await control.boundingBox();const viewport=await scroll.boundingBox();expect(bounds).not.toBeNull();expect(viewport).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(viewport!.y-1);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport!.y+viewport!.height+1);
}
test("Draft first and twelfth working controls stay reachable with all actions at 320x180",async({page},info)=>{
  test.setTimeout(90000);await page.goto(meal("draft"));await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30000});
  const body=page.locator('[data-workspace-scroll="body"]');const footer=page.locator('footer[aria-label="Draft actions"]');
  for(const height of [480,240,180]){
    await page.setViewportSize({width:320,height});
    const geometry=await body.evaluate(element=>({height:element.clientHeight,top:element.getBoundingClientRect().top}));console.log("Draft short viewport",height,geometry);
    expect(geometry.height).toBeGreaterThanOrEqual(40);
    await fullyVisibleWithin(page.getByLabel("Meal pax",{exact:true}),body);
    await page.getByLabel("Meal pax",{exact:true}).fill("60");
    await fullyVisibleWithin(page.getByRole("button",{name:"Actions for Stock item Rice",exact:true}).last(),body);
    for(const name of ["Review quantities and stock","Save draft","Post issuance"]){
      const button=footer.getByRole("button",{name,exact:true});await expect(button).toBeInViewport({ratio:1});
      const bounds=await button.evaluate(element=>({height:element.getBoundingClientRect().height,width:element.getBoundingClientRect().width,fits:element.scrollWidth<=element.clientWidth&&element.scrollHeight<=element.clientHeight}));expect(bounds.height).toBeGreaterThanOrEqual(40);expect(bounds.width).toBeGreaterThanOrEqual(40);expect(bounds.fits).toBe(true);
    }
    expect(await body.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`draft-last-${height}.png`),fullPage:true});
  }
  await footer.getByRole("button",{name:"Review quantities and stock",exact:true}).click();
  const review=page.getByRole("dialog",{name:"Combined quantities and stock",exact:true});await expect(review.getByText("1.2 kg",{exact:true}).first()).toBeVisible();
  await review.getByRole("button",{name:"Close review",exact:true}).scrollIntoViewIfNeeded();await expect(review.getByRole("button",{name:"Close review",exact:true})).toBeInViewport({ratio:1});
  await page.keyboard.press("Escape");await expect(footer.getByRole("button",{name:"Review quantities and stock",exact:true})).toBeFocused();
  await page.setViewportSize({width:320,height:480});
  await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("60");
  const tops=await footer.getByRole("button").evaluateAll(elements=>elements.map(element=>Math.round(element.getBoundingClientRect().top)));
  expect(tops[0]).toBe(tops[1]);expect(tops[2]).toBeGreaterThan(tops[0]);
});

test("Posted results keep a scrolling read-only body at 320x180",async({page},info)=>{
  await page.setViewportSize({width:320,height:180});await page.goto(meal("posted"));await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30000});
  const body=page.locator('[data-workspace-scroll="body"]');expect(await body.evaluate(element=>element.clientHeight)).toBeGreaterThanOrEqual(40);
  const totals=page.getByRole("button",{name:"View issued totals",exact:true});await fullyVisibleWithin(totals,body);
  await expect(page.locator('footer[aria-label="Draft actions"]')).toHaveCount(0);
  await expect(page.getByRole("button",{name:/^(Save draft|Post issuance|Add Stock item)$/})).toHaveCount(0);
  await totals.click();const dialog=page.getByRole("dialog",{name:"Issued item totals",exact:true});
  const breakdown=dialog.getByRole("button",{name:"View breakdown for Rice",exact:true});await breakdown.scrollIntoViewIfNeeded();await expect(breakdown).toBeInViewport({ratio:1});await breakdown.click();
  const details=page.getByRole("dialog",{name:"Details for Rice",exact:true});await details.getByRole("button",{name:"Calculation details",exact:true}).scrollIntoViewIfNeeded();await expect(details.getByRole("button",{name:"Calculation details",exact:true})).toBeInViewport({ratio:1});
  expect(await details.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);await page.screenshot({path:info.outputPath("posted-sources-180.png"),fullPage:true});
});
