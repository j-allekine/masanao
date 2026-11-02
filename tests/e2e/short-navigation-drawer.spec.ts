import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";

const id = `short-navigation-${randomUUID()}`;
const destinations = ["Dashboard", "Planning", "Inventory", "Purchase Orders", "Items", "Recipes", "Master Data"];
const design = `/activity-designs/${id}`;
const activity = `${design}/activities/${id}`;
const routes = ["/dashboard", "/activity-designs", "/activities", design, activity,
  `${activity}/meal-schedules/${id}`, "/master-data", "/inventory", "/items", "/recipes",
  "/recipes/new", "/recipes/e2e-recipe-active", "/recipes/e2e-recipe-active/edit",
  "/purchase-orders", `/purchase-orders/${id}`];

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("INSERT INTO activity_design(id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES(?,?, 'Drawer verification',2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id,id);
    db.prepare("INSERT INTO activity(id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES(?,?,'Kitchen Activity','Kitchen','2026-11-01',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id,id);
    db.prepare("INSERT INTO meal_schedule(id,activityId,label,mealTime,createdAt,updatedAt) VALUES(?,?,'Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id,id);
    db.prepare("INSERT INTO purchase_order(id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES(?,?,?,'e2e-vendor-acme',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(id,id,id);
  } finally { db.close(); }
});

async function signIn(page: Page) {
  expect((await page.request.post("/api/auth/sign-in/username", {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.context().addCookies([{name:"sidebar_state",value:"false",url:process.env.BETTER_AUTH_URL!}]);
}
async function settled(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation =>
      animation.playState === "running" && animation.effect?.getComputedTiming().iterations !== Infinity,
    ).map(animation => animation.finished.catch(() => {})));
  });
}
async function wholeTarget(target: Locator, container?: Locator) {
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  await expect(target).toBeFocused();
  await expect.poll(() => target.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const body = el.closest('[data-slot="sidebar-content"]')?.getBoundingClientRect();
    const drawer=el.closest<HTMLElement>('[data-mobile="true"]');
    const availableRight=drawer ? drawer.getBoundingClientRect().left+drawer.clientWidth : innerWidth;
    return rect.height >= 40 && rect.width >= 40 && rect.top >= (body?.top ?? 0) &&
      rect.bottom <= (body?.bottom ?? innerHeight) && rect.left >= 0 && rect.right <= Math.min(innerWidth,availableRight);
  })).toBe(true);
  if (container) await expect(container).toBeVisible();
}

for (const scenario of [
  {name:"short180",width:320,height:180,text:100},
  {name:"enlarged200",width:320,height:480,text:200},
  {name:"phone",width:390,height:844,text:100},
]) test(`drawer keeps all destinations and account reachable: ${scenario.name}`, async ({page},info) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.setViewportSize(scenario);
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  await page.evaluate(text => document.documentElement.style.fontSize = `${text}%`, scenario.text);
  const opener = page.locator("header").getByRole("button",{name:"Toggle Sidebar",exact:true});
  await opener.click();
  const drawer = page.getByRole("dialog",{name:"Sidebar",exact:true});
  await expect(drawer).toBeVisible();
  await settled(page);
  await expect.poll(() => drawer.locator('[data-slot="sidebar-content"]').evaluate(el => el.clientHeight)).toBeGreaterThanOrEqual(40 * scenario.text / 100);
  const brand = drawer.getByRole("link",{name:"Masanao Municipal kitchen",exact:true});
  await wholeTarget(brand);
  for (const name of destinations) {
    const link=drawer.getByRole("navigation",{name:"Workspace",exact:true}).getByRole("link",{name,exact:true});
    await wholeTarget(link,drawer);
    expect(await link.evaluate(el=>{
      const text=el.lastElementChild!.firstChild!, value=text.textContent!;
      return [...value.matchAll(/\S+/g)].every(word=>{
        const range=document.createRange(); range.setStart(text,word.index); range.setEnd(text,word.index+word[0].length);
        return range.getClientRects().length===1;
      });
    })).toBe(true);
  }
  await page.screenshot({path:info.outputPath(`${scenario.name}-last-destination.png`),animations:"disabled"});
  await info.attach("settled-drawer-geometry",{contentType:"application/json",body:JSON.stringify(await drawer.evaluate(el => {
    const bounds=(selector:string)=>{const rect=el.querySelector(selector)!.getBoundingClientRect();return {top:rect.top,bottom:rect.bottom,height:rect.height};};
    return {viewport:{width:innerWidth,height:innerHeight},header:bounds('[data-slot="sidebar-header"]'),body:bounds('[data-slot="sidebar-content"]'),footer:bounds('[data-slot="sidebar-footer"]')};
  }))});
  await wholeTarget(drawer.getByRole("button",{name:"Close",exact:true}));
  const account = drawer.getByRole("button",{name:"Municipal Administrator account menu",exact:true});
  await wholeTarget(account);
  for(const identity of [brand,account]) expect(await identity.evaluate(el=>
    [...el.querySelectorAll("span > span")].every(span=>span.scrollWidth<=span.clientWidth),
  )).toBe(true);
  await account.click();
  const logout = page.getByRole("menuitem",{name:"Log out",exact:true});
  await wholeTarget(logout);
  await page.screenshot({path:info.outputPath(`${scenario.name}-account-menu.png`),animations:"disabled"});
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await opener.click();
  await drawer.getByRole("link",{name:"Recipes",exact:true}).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByRole("heading",{level:1,name:"Recipes",exact:true})).toBeFocused();
  await expect(drawer).toHaveCount(0);
  expect((await page.context().cookies()).find(cookie=>cookie.name==="sidebar_state")?.value).toBe("false");
  await opener.click();
  await settled(page);
  await drawer.getByRole("button",{name:"Municipal Administrator account menu",exact:true}).click();
  await logout.click();
  await expect(page).toHaveURL(/\/$/);
  expect((await page.context().cookies()).find(cookie=>cookie.name==="sidebar_state")?.value).toBe("false");
  await page.screenshot({path:info.outputPath(`${scenario.name}-signed-out.png`)});
});

test("short drawer composition is reachable across all production shell route families",async({page},info)=>{
  test.setTimeout(240_000);
  await signIn(page);
  await page.setViewportSize({width:320,height:180});
  for(const path of routes) {
    await page.goto(path);
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    const opener=page.locator("header").getByRole("button",{name:"Toggle Sidebar",exact:true});
    await opener.click();
    const drawer=page.getByRole("dialog",{name:"Sidebar",exact:true});
    await settled(page);
    await wholeTarget(drawer.getByRole("navigation",{name:"Workspace",exact:true}).getByRole("link",{name:"Master Data",exact:true}));
    await wholeTarget(drawer.getByRole("button",{name:"Municipal Administrator account menu",exact:true}));
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
  }
  await page.screenshot({path:info.outputPath("all-shell-routes.png")});
});

for(const width of [900,1280]) test(`normal ${width} sidebar preserves its saved preference and account`,async({page})=>{
  await signIn(page);
  await page.setViewportSize({width,height:800});
  await page.goto("/items");
  await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
  const sidebar=page.locator('[data-slot="sidebar"][data-state]').filter({visible:true});
  await expect(sidebar).toHaveAttribute("data-state","collapsed");
  await page.locator("header").getByRole("button",{name:"Toggle Sidebar",exact:true}).click();
  await expect(sidebar).toHaveAttribute("data-state","expanded");
  for(const name of destinations) await wholeTarget(sidebar.getByRole("link",{name,exact:true}));
  await wholeTarget(sidebar.getByRole("button",{name:"Municipal Administrator account menu",exact:true}));
  await page.reload();
  await expect(page.locator('[data-shell-client-ready="true"]').filter({visible:true})).toBeVisible();
  await expect(sidebar).toHaveAttribute("data-state","expanded");
  expect((await page.context().cookies()).find(cookie=>cookie.name==="sidebar_state")?.value).toBe("true");
});
