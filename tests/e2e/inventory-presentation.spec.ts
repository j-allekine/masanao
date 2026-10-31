import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const itemName = "InventoryLong".repeat(16).slice(0, 200);
const categoryName = "Category長".repeat(12).slice(0, 100);
const unitName = "BaseUnit長".repeat(12).slice(0, 100);
const abbreviation = "LongAbbreviation".repeat(2).slice(0, 30);

test("Inventory uses one labelled row with complete long facts, explicit invalid state and exact quantity at phone and tablet widths", async ({ page, context }, info) => {
  test.setTimeout(120_000);
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("INSERT INTO category (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('inv-present-category',?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(categoryName, categoryName.toLowerCase());
    db.prepare("INSERT INTO unit (id,name,normalizedName,abbreviation,normalizedAbbreviation,active,createdAt,updatedAt) VALUES ('inv-present-unit',?,?,?,?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(unitName, unitName.toLowerCase(), abbreviation, abbreviation.toLowerCase());
    db.prepare("INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('inv-present-long',?,?,'inv-present-category','inv-present-unit','0.000000000000000001',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(itemName, itemName.toLowerCase());
    db.prepare("INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('inv-present-invalid','Inventory invalid setting','inventory invalid setting','inv-present-category','inv-present-unit','invalid',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
    expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
    await context.addCookies([{ name: "sidebar_state", value: "true", url: process.env.BETTER_AUTH_URL! }]);
    for (const width of [320, 1024, 1280]) {
      await page.setViewportSize({ width, height: 480 });
      await page.goto("/inventory?q=Inventory");
      await expect(page.locator('[data-inventory-ready="true"]')).toBeVisible();
      await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
      await expect(page.getByRole("table", { name: "Inventory", exact: true })).toHaveCount(1);
      const row = page.locator('[data-item-id="inv-present-long"]');
      await expect(row).toHaveCount(1);
      await expect(row).toHaveCSS("display", width === 320 ? "grid" : "table-row");
      for (const [label, value] of [["Item", itemName], ["Category", categoryName], ["On hand", `0 ${abbreviation}`], ["Base Unit", `${unitName} (${abbreviation})`], ["Reorder level", `0.000000000000000001 ${abbreviation}`]]) {
        await expect(row.locator(`[data-label="${label}"]`)).toHaveText(value);
      }
      await expect(page.locator('[data-item-id="inv-present-invalid"]')).toContainText("Invalid Reorder level. Review Item settings.");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await row.evaluate(element => Array.from(element.querySelectorAll("td")).every(cell => cell.scrollWidth <= cell.clientWidth + 1))).toBe(true);
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await page.screenshot({ path: info.outputPath(`inventory-long-${width}.png`), fullPage: true, animations: "disabled" });
    }
  } finally {
    db.exec("DELETE FROM item WHERE id LIKE 'inv-present-%'; DELETE FROM unit WHERE id='inv-present-unit'; DELETE FROM category WHERE id='inv-present-category'");
    db.close();
  }
});
