import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

const period="start=2020-10-01&end=2020-10-31";
const applied=`/dashboard?${period}&activitySearch=Origin+kitchen&budgetPage=2`;
const activity="/activity-designs/dash-origin-design/activities/dash-origin-06";
test.beforeAll(()=>{
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try{
    db.exec("INSERT INTO activity_design(id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('dash-origin-design','AD-ORIGIN',2020,'Dashboard origin training',0,0)");
    for(let index=1;index<=12;index++){
      const id=String(index).padStart(2,"0");
      db.prepare("INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,plannedBudgetCentavos,createdAt,updatedAt) VALUES (?,'dash-origin-design',?,'Origin kitchen','2020-10-15T00:00:00.000Z',?,0,0)").run(`dash-origin-${id}`,`Origin Activity ${id}`,index===7 ? null : 100000);
      db.prepare("INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,?,'Lunch','12:00',0,0)").run(`dash-origin-meal-${id}`,`dash-origin-${id}`);
    }
  }finally{db.close();}
});
test.afterAll(()=>{
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try{db.exec("DELETE FROM meal_schedule WHERE id LIKE 'dash-origin-%'; DELETE FROM activity WHERE id LIKE 'dash-origin-%'; DELETE FROM activity_design WHERE id='dash-origin-design'");}finally{db.close();}
});

test("Dashboard access loss, session recovery and absent origin keep the applied report boundary",async({page,context})=>{
  test.setTimeout(90000);
  const signIn=async()=>expect((await page.request.post("/api/auth/sign-in/username",{data:{username:"kitchen.staff",password:"correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await signIn();await page.goto(applied);await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible({timeout:30000});
  const reportLink=page.getByRole("link",{name:"Origin Activity 06",exact:true});const href=await reportLink.getAttribute("href");
  const db=new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try{
    db.prepare("UPDATE user SET disabled=1 WHERE username='kitchen.staff'").run();
    await page.getByRole("button",{name:"Refresh",exact:true}).click();
    await expect(page.getByRole("alert").filter({hasText:"Report unavailable"})).toContainText("Staff access required.");
    await expect(reportLink).toHaveCount(0);
  }finally{db.prepare("UPDATE user SET disabled=0 WHERE username='kitchen.staff'").run();db.close();}
  await page.getByRole("button",{name:"Refresh",exact:true}).click();await expect(reportLink).toHaveAttribute("href",href!);
  expect(new URL(page.url()).searchParams.get("budgetPage")).toBe("2");
  await context.clearCookies();await page.reload();await expect(page).toHaveURL("/",{timeout:30000});
  await signIn();await page.goto(applied);await expect(reportLink).toHaveAttribute("href",href!);
  await page.goto(activity);await expect(page.getByRole("heading",{name:"Origin Activity 06",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Return to Dashboard",exact:true})).toHaveCount(0);
  await expect(page.getByRole("navigation",{name:"breadcrumb",exact:true}).getByRole("link",{name:"AD-ORIGIN",exact:true})).toBeVisible();
});

for (const username of ["kitchen.staff", "municipal.admin"]) test(`${username} retains applied Dashboard origin through real ancestry and guarded cancellation`, async ({page,context},info)=>{
  test.setTimeout(180000);
  expect((await page.request.post("/api/auth/sign-in/username",{data:{username,password:username==="municipal.admin" ? "administrator-password" : "correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await page.goto(applied);
  await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible({timeout:30000});
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const reportLink=page.getByRole("link",{name:"Origin Activity 06",exact:true});
  const appliedHref=await reportLink.getAttribute("href");
  let releaseRefresh!:()=>void;
  const refreshGate=new Promise<void>(resolve=>{releaseRefresh=resolve;});
  await page.route("**/dashboard?**",async route=>{await refreshGate;await route.continue();},{times:1});
  await page.getByRole("button",{name:"Refresh",exact:true}).click();
  try{
    await expect(page.getByRole("button",{name:"Updating…",exact:true})).toBeDisabled();
    await expect(reportLink).toHaveAttribute("href",appliedHref!);
    await expect(page.getByRole("button",{name:"Reporting period",exact:true})).toBeDisabled();
  }finally{releaseRefresh();}
  await expect(page.getByRole("button",{name:"Refresh",exact:true})).toBeEnabled();
  await expect(reportLink).toHaveAttribute("href",appliedHref!);
  await reportLink.click();
  await expect(page.getByRole("heading",{name:"Origin Activity 06",exact:true})).toBeVisible({timeout:30000});
  const returnLink=page.getByRole("link",{name:"Return to Dashboard",exact:true});
  await expect(returnLink).toHaveAttribute("href",`${applied}#dashboard-activity-dash-origin-06`);
  await page.getByRole("button",{name:"Edit Activity",exact:true}).click();
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(returnLink).toHaveAttribute("href",`${applied}#dashboard-activity-dash-origin-06`);
  await page.getByRole("link",{name:"Open Meal Schedule: Lunch",exact:true}).click();
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30000});
  await expect(returnLink).toHaveAttribute("href",`${applied}#dashboard-activity-dash-origin-06`);
  const mealUrl=page.url();
  const legacy=new URL(mealUrl);legacy.pathname+="/issuance";
  await page.goto(legacy.toString());await expect(page).toHaveURL(mealUrl);
  await page.reload();await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible({timeout:30000});
  const popupPromise=context.waitForEvent("page");await returnLink.click({modifiers:["Control"]});
  const popup=await popupPromise;await expect(popup.locator('[data-dashboard-ready="true"]')).toBeVisible({timeout:30000});
  await expect(popup.getByRole("link",{name:"Origin Activity 06",exact:true})).toBeFocused();await popup.close();
  await page.getByLabel("Meal pax",{exact:true}).fill("51");
  await returnLink.click();
  const discard=page.getByRole("dialog",{name:"Discard unsaved changes?",exact:true});
  await expect(discard).toBeVisible();await discard.getByRole("button",{name:"Keep editing",exact:true}).click();
  await expect(returnLink).toBeFocused();await expect(page.getByLabel("Meal pax",{exact:true})).toHaveValue("51");
  await page.getByRole("navigation",{name:"breadcrumb",exact:true}).getByRole("link",{name:"Origin Activity 06",exact:true}).click();
  await expect(discard).toBeVisible();await discard.getByRole("button",{name:"Discard changes",exact:true}).click();
  await expect(page.getByRole("link",{name:"Open Meal Schedule: Lunch",exact:true})).toBeFocused();
  await page.getByRole("navigation",{name:"breadcrumb",exact:true}).getByRole("link",{name:"AD-ORIGIN",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Dashboard origin training",exact:true})).toBeVisible({timeout:30000});
  await expect(returnLink).toHaveAttribute("href",`${applied}#dashboard-activity-dash-origin-06`);
  await page.goBack();await expect(page.getByRole("heading",{name:"Origin Activity 06",exact:true})).toBeVisible();
  await page.goForward();await expect(page.getByRole("heading",{name:"Dashboard origin training",exact:true})).toBeVisible();
  await returnLink.click();await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible({timeout:30000});
  await expect(reportLink).toBeFocused();expect(new URL(page.url()).searchParams.get("budgetPage")).toBe("2");
  const query=new URL(mealUrl).searchParams;
  for(const invalid of ["https://evil.invalid/dashboard?start=2020-10-01&end=2020-10-31","/dashboard?start=2020-10-01&end=2020-10-31&unknown=1"]){
    query.set("dashboardOrigin",invalid);await page.goto(`${new URL(mealUrl).pathname}?${query}`);await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();await expect(returnLink).toHaveCount(0);
    await expect(page.getByRole("navigation",{name:"breadcrumb",exact:true}).getByRole("link",{name:"Origin Activity 06",exact:true})).toBeVisible();
  }
  query.set("dashboardOrigin",applied);query.set("dashboardOriginOwner","/activity-designs/dash-origin-design/activities/dash-origin-05");
  await page.goto(`${new URL(mealUrl).pathname}?${query}`);await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();await expect(returnLink).toHaveCount(0);
  await page.goto(`/activity-designs/dash-origin-design?${query}`);await expect(page.getByRole("heading",{name:"Dashboard origin training",exact:true})).toBeVisible();await expect(returnLink).toHaveCount(1);
  query.set("dashboardOriginOwner","/activity-designs/dash-origin-design/activities/missing");await page.goto(`/activity-designs/dash-origin-design?${query}`);await expect(page.getByRole("heading",{name:"Dashboard origin training",exact:true})).toBeVisible();await expect(returnLink).toHaveCount(0);
  await page.setViewportSize({width:320,height:480});await page.goto(mealUrl);await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await page.evaluate(()=>{document.documentElement.style.fontSize="200%";});await returnLink.scrollIntoViewIfNeeded();
  expect(await returnLink.evaluate(element=>element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath("meal-origin-320-200.png")});
  await returnLink.click();await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible();await expect(reportLink).toBeFocused();
});

test("Dashboard links carry applied page-2 state while unsent search and period fields remain local",async({page,context},info)=>{
  test.setTimeout(90000);
  expect((await page.request.post("/api/auth/sign-in/username",{data:{username:"kitchen.staff",password:"correct-horse-battery-staple"},headers:{origin:process.env.BETTER_AUTH_URL!}})).status()).toBe(200);
  await page.goto(applied);await expect(page.locator('[data-dashboard-ready="true"]')).toBeVisible({timeout:30000});
  const link=page.getByRole("link",{name:"Origin Activity 06",exact:true});
  const href=await link.getAttribute("href");
  expect(href?.split("?")[0]).toBe(activity);
  const query=new URLSearchParams(href!.split("?")[1]);
  expect(query.get("dashboardOrigin")).toBe(applied);
  expect(query.get("dashboardOriginOwner")).toBe(activity);
  const search=page.getByRole("searchbox",{name:"Search Activities by name or Office",exact:true});
  await search.fill("unsent local search");await expect(link).toHaveAttribute("href",href!);
  await page.getByRole("button",{name:"Reporting period",exact:true}).click();
  await page.getByLabel("From",{exact:true}).fill("2020-09-01");
  await expect(link).toHaveAttribute("href",href!);
  await page.keyboard.press("Escape");await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
  const popupPromise=context.waitForEvent("page");await link.click({modifiers:["Control"]});
  const popup=await popupPromise;await expect(popup).toHaveURL(new RegExp("/activities/dash-origin-06\\?"),{timeout:30000});
  expect(new URL(popup.url()).searchParams.get("dashboardOrigin")).toBe(applied);await popup.close();
  await expect(page).toHaveURL(new RegExp("budgetPage=2$"));
  for(const target of [680,688]){
    let width=900;await page.setViewportSize({width,height:700});
    const pane=page.locator('[data-dashboard-header]');
    for(let attempt=0;attempt<3;attempt++){
      await page.evaluate(async()=>{await Promise.allSettled(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished));});
      const actual=await pane.evaluate(element=>element.clientWidth);if(actual===target)break;
      width+=target-actual;await page.setViewportSize({width,height:700});
    }
    await expect.poll(()=>pane.evaluate(element=>element.clientWidth)).toBe(target);
    const geometry=await pane.locator("header").evaluate(element=>{const style=getComputedStyle(element);return {inner:element.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),gutter:parseFloat(style.paddingLeft),title:getComputedStyle(element.querySelector("h1")!).fontSize};});
    expect(geometry).toEqual({inner:target-48,gutter:24,title:target===680 ? "24px" : "32px"});
  }
  await page.setViewportSize({width:768,height:600});
  await page.locator("header").getByRole("button",{name:"Toggle Sidebar",exact:true}).first().click();
  await page.evaluate(async()=>{await Promise.allSettled(document.getAnimations().filter(animation=>animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished));});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath("report-expanded-tablet.png"),fullPage:true});
  for(const enlarged of [false,true]){
    await page.setViewportSize({width:320,height:480});await page.evaluate(value=>{document.documentElement.style.fontSize=value ? "200%" : "";},enlarged);
    for(const name of ["Reporting period","Refresh","Search"]){const button=page.getByRole("button",{name,exact:true});await button.scrollIntoViewIfNeeded();await expect(button).toBeInViewport();const bounds=await button.evaluate(element=>({height:element.getBoundingClientRect().height,fits:element.scrollWidth<=element.clientWidth&&element.scrollHeight<=element.clientHeight}));expect(bounds.height).toBeGreaterThanOrEqual(40);expect(bounds.fits).toBe(true);}
    const overflow=await page.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth,width:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll<HTMLElement>("[data-dashboard-surface] *")].filter(element=>element.getClientRects().length>0&&element.getBoundingClientRect().right>innerWidth).map(element=>({tag:element.tagName,slot:element.dataset.slot,class:element.className,right:element.getBoundingClientRect().right,text:element.textContent?.slice(0,40)})).slice(0,12)}));
    if(!overflow.fits)console.log("Dashboard overflow",JSON.stringify(overflow));expect(overflow.fits).toBe(true);
    await page.getByRole("button",{name:"Reporting period",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Reporting period",exact:true})).toBeFocused();
    await page.getByRole("button",{name:"Apply period",exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole("button",{name:"Apply period",exact:true})).toBeInViewport();
    await page.screenshot({path:info.outputPath(`period-320-${enlarged ? 200 : 100}.png`),fullPage:true});await page.keyboard.press("Escape");await expect(page.locator('[data-slot="popover-content"]')).toHaveCount(0);
    await page.getByRole("heading",{name:"Budget accounting",exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`report-320-${enlarged ? 200 : 100}.png`),fullPage:true});
  }
});
