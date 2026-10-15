import Database from "better-sqlite3";

// These namespaces belong only to issuance browser fixtures. Keep shared Recipe
// setup intact so later catalog journeys can exercise its lifecycle independently.
const prefixes = ["e2e-issuance-", "e2e-post-", "e2e-regression-", "e2e-review-", "e2e-stock-", "e2e-ux-", "fifo-"];
export function cleanupIssuanceFixtures() {
  const path = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!path || path.endsWith("issuance-221-manual.db")) throw new Error("An isolated browser-test database is required.");
  const db = new Database(path);
  try {
    db.transaction(() => {
      const owned = (table: string) => (db.prepare(`SELECT id FROM ${table} WHERE ${prefixes.map(() => "id LIKE ?").join(" OR ")}`).all(...prefixes.map((prefix) => `${prefix}%`)) as { id: string }[]).map((row) => row.id);
      const related = (table: string, column: string, ids: string[]) => ids.length ? (db.prepare(`SELECT id FROM ${table} WHERE ${column} IN (${ids.map(() => "?").join(",")})`).all(...ids) as { id: string }[]).map((row) => row.id) : [];
      const remove = (table: string, column: string, ids: string[]) => { if (ids.length) db.prepare(`DELETE FROM ${table} WHERE ${column} IN (${ids.map(() => "?").join(",")})`).run(...ids); };
      const meals = owned("meal_schedule");
      const records = related("issuance_record", "mealScheduleId", meals);
      const totals = related("issuance_item_total", "issuanceRecordId", records);
      const snapshots = related("issuance_recipe_snapshot", "issuanceRecordId", records);
      const receipts = owned("delivery_receipt");
      const receiptLines = related("delivery_receipt_line", "deliveryReceiptId", receipts);
      remove("issuance_receipt_allocation", "issuanceItemTotalId", totals);
      remove("inventory_ledger_movement", "issuanceItemTotalId", totals);
      remove("inventory_ledger_movement", "deliveryReceiptLineId", receiptLines);
      remove("issuance_item_total", "id", totals);
      remove("issuance_recipe_ingredient", "recipeSnapshotId", snapshots);
      remove("issuance_recipe_snapshot", "id", snapshots);
      remove("issuance_stock_item", "issuanceRecordId", records);
      remove("issuance_record", "id", records);
      remove("delivery_receipt_line", "id", receiptLines);
      remove("delivery_receipt", "id", receipts);
      remove("purchase_order", "id", owned("purchase_order"));
      remove("vendor", "id", owned("vendor"));
      const recipes = owned("recipe");
      remove("recipe_ingredient", "recipeId", recipes);
      remove("recipe", "id", recipes);
      const items = owned("item");
      remove("item_unit_conversion", "itemId", items);
      remove("item", "id", items);
      remove("meal_schedule", "id", meals);
      remove("activity", "id", owned("activity"));
      remove("activity_design", "id", owned("activity_design"));
      // The alternate-Unit snapshot journey deliberately changes this shared
      // conversion; restore its global-setup value before the next module runs.
      db.prepare("UPDATE item_unit_conversion SET baseUnitQuantity='0.001' WHERE id='e2e-recipe-conversion-rice-gram'").run();
    })();
  } finally { db.close(); }
}
