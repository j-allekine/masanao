import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const name = "DeleteLongItem".repeat(16).slice(0, 200);
test("Item deletion keeps a complete long identity and real server error reachable on a short phone", async ({ page }, info) => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.prepare("INSERT INTO item(id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt) VALUES ('touch-delete-item',?,?,'default-category-staples-dry-goods','default-unit-kilogram','1',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run(name, name.toLowerCase());
    db.prepare("INSERT INTO item_unit_conversion(id,itemId,alternateUnitId,baseUnitQuantity,createdAt,updatedAt) VALUES ('touch-delete-conversion','touch-delete-item','default-unit-piece','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
    expect((await page.request.post("/api/auth/sign-in/username", { data: { username: "municipal.admin", password: "administrator-password" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(`/items?itemsSearch=${name}`);
    const action = page.getByRole("button", { name: `Actions for ${name}`, exact: true });
    await action.click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("alertdialog", { name: `Delete “${name}”?`, exact: true });
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(element => { const box = element.getBoundingClientRect(); return box.top >= 15 && box.bottom <= innerHeight - 15 && box.left >= 15 && box.right <= innerWidth - 15 && element.scrollWidth <= element.clientWidth; })).toBe(true);
    await dialog.getByRole("button", { name: "Delete Item", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Deletion failed");
    await expect(dialog).toContainText(name);
    await dialog.evaluate(element => { element.scrollTop = 0; });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: info.outputPath("item-delete-error-short-top.png"), animations: "disabled" });
    const cancel = dialog.getByRole("button", { name: "Cancel", exact: true });
    await cancel.scrollIntoViewIfNeeded();
    await expect(cancel).toBeInViewport();
    expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await page.screenshot({ path: info.outputPath("item-delete-error-short-actions.png"), animations: "disabled" });
    await cancel.click();
    await expect(dialog).toHaveCount(0);
    await expect(action).toBeFocused();
  } finally {
    db.exec("DELETE FROM item_unit_conversion WHERE id='touch-delete-conversion'; DELETE FROM item WHERE id='touch-delete-item'");
    db.close();
  }
});
