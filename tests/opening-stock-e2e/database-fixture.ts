import Database from "better-sqlite3";

export const openingStockBaselinePath = (databasePath: string) =>
  `${databasePath}.opening-stock-baseline.db`;

/** Test-only restoration; keep the file/inode used by the running app intact. */
export function restoreOpeningStockBaseline(databasePath: string) {
  const database = new Database(databasePath, { fileMustExist: true, timeout: 10_000 });
  try {
    const baseline = openingStockBaselinePath(databasePath);
    // Opening read-only also prevents a missing baseline from becoming an empty DB.
    const seed = new Database(baseline, { readonly: true, fileMustExist: true });
    seed.close();
    database.prepare("ATTACH DATABASE ? AS opening_stock_fixture").run(baseline);
    const tables = database.prepare("SELECT name FROM opening_stock_fixture.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
    const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
    database.pragma("foreign_keys = OFF");
    database.transaction(() => {
      for (const { name } of tables) database.exec(`DELETE FROM main.${quote(name)}`);
      for (const { name } of tables) database.exec(`INSERT INTO main.${quote(name)} SELECT * FROM opening_stock_fixture.${quote(name)}`);
      if ((database.pragma("foreign_key_check") as unknown[]).length) throw new Error("Opening Stock browser fixture has broken references");
    }).immediate();
    database.pragma("foreign_keys = ON");
    database.exec("DETACH DATABASE opening_stock_fixture");
  } finally {
    database.close();
  }
}
