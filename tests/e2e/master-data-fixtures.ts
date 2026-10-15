import Database from "better-sqlite3";
import { basename } from "node:path";

const restoreOrder = ["category", "unit", "office", "vendor", "item", "item_unit_conversion", "recipe_ingredient"] as const;
const deleteOrder = [...restoreOrder].reverse();

/** Snapshot only the reference catalog graph in a generated, disposable E2E DB. */
export function isolateMasterDataFixture(title: string): () => void {
  const path = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!path || !/^masanao-e2e-[0-9a-f-]+\.db$/i.test(basename(path))) throw new Error("Master Data isolation requires the generated E2E database.");
  const db = new Database(path);
  const assertNoTransactions = () => {
    for (const table of ["purchase_order", "delivery_receipt", "issuance_record", "inventory_ledger_movement"]) {
      if ((db.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number }).count) throw new Error(`Cannot replace reference fixtures while ${table} has records.`);
    }
  };
  try { assertNoTransactions(); } catch (error) { db.close(); throw error; }
  const baseline = new Map(restoreOrder.map((table) => [table, db.prepare(`SELECT * FROM ${table}`).all() as Record<string, string | number | null>[]]));
  db.transaction(() => {
    const emptyUnits = title.includes("maintain Units");
    const emptyCategories = title.includes("maintain Categories") || title === "keeps an authenticated non-administrator read-only";
    if (emptyUnits || emptyCategories) {
      for (const table of ["recipe_ingredient", "item_unit_conversion", "item"]) db.prepare(`DELETE FROM ${table}`).run();
      db.prepare(`DELETE FROM ${emptyUnits ? "unit" : "category"}`).run();
    }
    if (title.includes("maintain Offices")) db.prepare("DELETE FROM office").run();
    if (title.includes("read-only for Offices")) db.prepare("INSERT INTO office (id,name,normalizedName,isActive,createdAt,updatedAt) VALUES ('master-data-readonly-office','Office 01','office 01',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").run();
  })();
  return () => {
    try {
      assertNoTransactions();
      db.transaction(() => {
        for (const table of deleteOrder) db.prepare(`DELETE FROM ${table}`).run();
        for (const table of restoreOrder) {
          for (const row of baseline.get(table)!) {
            const columns = Object.keys(row);
            db.prepare(`INSERT INTO ${table} (${columns.map((column) => `"${column}"`).join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...columns.map((column) => row[column]));
          }
        }
      })();
    } finally { db.close(); }
  };
}
