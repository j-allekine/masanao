import Database from "better-sqlite3";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

it("completes a migrated Recipe through the update command on the same record", async () => {
  const directory = mkdtempSync(join(tmpdir(), "recipe-baseline-migration-"));
  const path = join(directory, "legacy.db");
  const db = new Database(path);
  const previousDatabaseUrl = process.env.DATABASE_URL;
  let disconnect: (() => Promise<void>) | undefined;
  try {
    db.exec(`CREATE TABLE item (id TEXT PRIMARY KEY, baseUnitId TEXT NOT NULL, isActive BOOLEAN NOT NULL);
      CREATE TABLE recipe (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalizedName TEXT NOT NULL UNIQUE,
        preparationNote TEXT, isActive BOOLEAN NOT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL);
      CREATE TABLE recipe_ingredient (id TEXT PRIMARY KEY, recipeId TEXT NOT NULL, itemId TEXT NOT NULL,
        enteredQuantity TEXT NOT NULL, itemUnitConversionId TEXT, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL);
      INSERT INTO item VALUES ('rice', 'kilogram', 1);
      INSERT INTO recipe VALUES ('legacy', 'Legacy Soup', 'legacy soup', 'Original note', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      INSERT INTO recipe_ingredient VALUES ('line', 'legacy', 'rice', '0.1250', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`);
    db.exec(readFileSync(join(process.cwd(), "src/prisma/migrations/20261011090000_add_recipe_baseline_pax/migration.sql"), "utf8"));
    expect(db.prepare("SELECT baselinePax FROM recipe WHERE id = 'legacy'").get()).toEqual({ baselinePax: null });
    expect(db.prepare("SELECT enteredQuantity FROM recipe_ingredient WHERE recipeId = 'legacy'").get()).toEqual({ enteredQuantity: "0.1250" });

    process.env.DATABASE_URL = `file:${path.replaceAll("\\", "/")}`;
    vi.resetModules();
    const { prisma } = await import("../src/prisma/client");
    disconnect = () => prisma.$disconnect();
    const { updateRecipeCommand } = await import("../src/features/recipes/server/commands/update-recipe");
    const result = await updateRecipeCommand("legacy", {
      name: "Legacy Soup", preparationNote: "Original note", baselinePax: "50",
      ingredients: [{ itemId: "rice", quantity: "0.1250", itemUnitConversionId: null }],
    });
    expect(result).toMatchObject({ ok: true, recipe: { id: "legacy", baselinePax: 50 } });
    expect(db.prepare("SELECT id, name, preparationNote, baselinePax FROM recipe WHERE id = 'legacy'").get())
      .toEqual({ id: "legacy", name: "Legacy Soup", preparationNote: "Original note", baselinePax: 50 });
    expect(db.prepare("SELECT itemId, enteredQuantity, itemUnitConversionId FROM recipe_ingredient WHERE recipeId = 'legacy'").all())
      .toEqual([{ itemId: "rice", enteredQuantity: "0.1250", itemUnitConversionId: null }]);
  } finally {
    await disconnect?.();
    db.close();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    vi.resetModules();
    rmSync(directory, { recursive: true, force: true });
  }
});
