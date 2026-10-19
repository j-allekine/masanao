import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";

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
test.afterAll(cleanupIssuanceFixtures);

test("Planning shows useful information once, reveals optional facts and preserves catalog return state", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await page.request.post("/api/auth/sign-in/username", { data: { username:"kitchen.staff", password:"correct-horse-battery-staple" },headers:{origin:process.env.BETTER_AUTH_URL!} })).status()).toBe(200);
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
