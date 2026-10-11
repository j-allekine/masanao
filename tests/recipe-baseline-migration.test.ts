import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("adds an unset baseline without changing legacy Recipe or ingredient data", () => {
  const db = new Database(":memory:");
  try {
    db.exec(`CREATE TABLE recipe (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE recipe_ingredient (id TEXT PRIMARY KEY, recipeId TEXT NOT NULL, enteredQuantity TEXT NOT NULL);
      INSERT INTO recipe (id, name) VALUES ('legacy', 'Legacy Soup');
      INSERT INTO recipe_ingredient (id, recipeId, enteredQuantity) VALUES ('line', 'legacy', '0.1250');`);
    db.exec(readFileSync(join(process.cwd(), "src/prisma/migrations/20261011090000_add_recipe_baseline_pax/migration.sql"), "utf8"));
    expect(db.prepare("SELECT id, name, baselinePax FROM recipe").get()).toEqual({ id: "legacy", name: "Legacy Soup", baselinePax: null });
    expect(db.prepare("SELECT id, recipeId, enteredQuantity FROM recipe_ingredient").get()).toEqual({ id: "line", recipeId: "legacy", enteredQuantity: "0.1250" });
  } finally {
    db.close();
  }
});
