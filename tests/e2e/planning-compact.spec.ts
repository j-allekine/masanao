import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { postFixtureSignIn } from "./fixture-auth";
import { expectPannedColumns, scrollWorkspaceDocument, workspaceViewports } from "./workspace-layout-helpers";

const design = "/activity-designs/e2e-issuance-compact-design-11";
const detailedActivity = `${design}/activities/e2e-issuance-compact-detailed`;
const catalog = "/activity-designs?activityDesignsSearch=Compact+Plan&activityDesignsPage=2";

test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.transaction(() => {
      for(let i=1; i<=12; i++) {
        const number=String(i).padStart(2,"0");
        db.prepare("INSERT INTO activity_design (id,activityDesignNo,title,fiscalYear,aipReferenceCode,createdAt,updatedAt) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(`e2e-issuance-compact-design-${number}`,`COMPACT-${number}`,`Compact Plan ${number}`,2026,i===11 ? "AIP-COMPACT" : null);
      }
      db.exec(`
        INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-issuance-compact-activity','e2e-issuance-compact-design-11','Compact Activity','Kitchen',CURRENT_TIMESTAMP,75,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
        INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,venue,particulars,plannedBudgetCentavos,createdAt,updatedAt) VALUES ('e2e-issuance-compact-detailed','e2e-issuance-compact-design-11','Detailed Activity','Kitchen',CURRENT_TIMESTAMP,75,'Municipal hall','Bring the prepared meal supplies to the community kitchen.',150000,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      `);
    })();
  } finally { db.close(); }
});

test("Planning catalogs and child records retain their identity through long lists", async ({ page }, info) => {
  test.setTimeout(180_000);
  const prefix = "e2e-issuance-compact-scroll";
  const longName = "Community kitchen operations and municipal supply coordination for emergency response volunteers";
  const nameFor = (index: number) => `Scroll ${String(index).padStart(2, "0")} ${longName}`;
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.transaction(() => {
      const insertDesign = db.prepare("INSERT INTO activity_design (id,activityDesignNo,title,fiscalYear,createdAt,updatedAt) VALUES (?,?,?,2026,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
      const insertActivity = db.prepare("INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
      const insertMeal = db.prepare("INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES (?,?,?, ?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
      for (let index = 0; index < 24; index++) {
        insertDesign.run(`${prefix}-design-${index}`, `SCROLL-AD-${index}`, nameFor(index));
        insertActivity.run(`${prefix}-activity-${index}`, `${prefix}-design-0`, nameFor(index), longName);
        insertMeal.run(`${prefix}-meal-${index}`, `${prefix}-activity-0`, nameFor(index), `12:${String(index).padStart(2, "0")}`);
      }
    })();
  } finally { db.close(); }

  expect((await postFixtureSignIn(page.request, {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  const record = `/activity-designs/${prefix}-design-0`;
  for (const [route, title, caption, screenshot] of [
    ["/activity-designs?activityDesignsSearch=Scroll", "Activity Designs", "Activity Designs", "designs"],
    ["/activities?activitiesSearch=Scroll", "Activities", "Activities", "activities"],
    [record, nameFor(0), "Activities under this Activity Design", "design"],
    [`${record}/activities/${prefix}-activity-0`, nameFor(0), "Meal Schedules under this Activity", "activity"],
  ]) {
    await page.goto(route);
    const main = page.getByRole("main");
    const heading = main.getByRole("heading", { name: title, level: 1, exact: true });
    const table = main.getByRole("table", { name: caption, exact: true });
    const toggle = main.getByRole("button", { name: "Toggle Sidebar", exact: true });
    for (const viewport of workspaceViewports) {
      await page.setViewportSize(viewport);
      await page.evaluate((enlarge) => {
        document.documentElement.style.fontSize = enlarge ? "150%" : "";
        document.body.style.letterSpacing = enlarge ? ".02em" : "";
        scrollTo(0, 0);
      }, viewport.width === 768 || viewport.height === 480);
      await expect(heading).toBeInViewport();
      for (const fraction of [0.5, 1]) {
        await scrollWorkspaceDocument(page, fraction);
        await expect(toggle).toBeInViewport({ ratio: 1 });
        await expect(heading).toBeInViewport({ ratio: 1 });
      }
      if (viewport.width >= 768) {
        const column = table.getByRole("columnheader").first();
        await expect(column).toBeInViewport();
        if (viewport.width === 768) await expectPannedColumns(column, table.getByRole("row").last().getByRole("cell").first());
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`planning-${screenshot}-${viewport.width}x${viewport.height}.png`) });
    }
  }
});
test.afterAll(cleanupIssuanceFixtures);

test("Planning shows useful information once, reveals optional facts and preserves catalog return state", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await postFixtureSignIn(page.request, { data: { username:"kitchen.staff", password:"correct-horse-battery-staple" },headers:{origin:process.env.BETTER_AUTH_URL!} })).status()).toBe(200);
  for (const width of [1280,320]) {
    await page.setViewportSize({width,height:800});
    await page.goto(catalog);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.getByRole("link", { name:"Compact Plan 11",exact:true }).click();
    await expect(page.getByRole("heading", {name:"Compact Plan 11",exact:true})).toBeVisible();
    await expect(page.getByText("COMPACT-11",{exact:true})).toHaveCount(1);
    await expect(page.getByText("Fiscal year: 2026",{exact:true})).toBeVisible();
    await expect(page.getByText("Activity Design context",{exact:true})).toHaveCount(0);
    await expect(page.getByRole("link",{name:/Back to/})).toHaveCount(0);
    await expect(page.getByText("AIP-COMPACT",{exact:true})).not.toBeVisible();
    const disclosure=page.getByRole("button",{name:"Additional details",exact:true});
    await disclosure.focus(); await page.keyboard.press("Enter");
    await expect(disclosure).toHaveAttribute("aria-expanded","true");
    await expect(page.getByText("AIP-COMPACT",{exact:true})).toBeVisible();
    await page.screenshot({path:info.outputPath(`design-${width}.png`),fullPage:true});
    await page.getByRole("link",{name:"Open Activity: Compact Activity",exact:true}).click();
    await page.waitForURL((url) => url.pathname === `${design}/activities/e2e-issuance-compact-activity`);
    await expect(page.getByRole("heading",{name:"Compact Activity",exact:true})).toBeVisible();
    await expect(page.getByText("75",{exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Additional details",exact:true})).toHaveCount(0);
    const returnLink=page.getByRole("link",{name:"Activity Designs",exact:true});
    await expect(returnLink).toHaveAttribute("href",catalog);
    await returnLink.click();
    await expect(page).toHaveURL(new RegExp("activityDesignsPage=2$"));
    await expect(page.getByRole("searchbox",{name:"Search Activity Designs",exact:true})).toHaveValue("Compact Plan");
    await expect(page.getByRole("link",{name:"Compact Plan 11",exact:true})).toBeVisible();
    await page.goto(detailedActivity);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await expect(page.getByText("Municipal hall",{exact:true})).not.toBeVisible();
    await page.getByRole("button",{name:"Additional details",exact:true}).click();
    await expect(page.getByText("Municipal hall",{exact:true})).toBeVisible();
    await expect(page.getByText("Bring the prepared meal supplies to the community kitchen.",{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`activity-${width}.png`),fullPage:true});
    await page.goto("/activity-designs/e2e-issuance-compact-design-12");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await expect(page.getByRole("button",{name:"Additional details",exact:true})).toHaveCount(0);
    await expect(page.getByRole("link",{name:"Activity Designs",exact:true})).toHaveAttribute("href","/activity-designs");
  }
});
