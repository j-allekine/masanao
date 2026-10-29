import Database from "better-sqlite3";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("sample seed keeps mixed-price receipt quantities valid, preserves missing budgets, and is idempotent", () => {
  const root = mkdtempSync(join(tmpdir(), "masanao-preview-seed-"));
  const filename = join(root, ".next-e2e-dashboard-preview.db");
  const db = new Database(filename);
  try {
    const migrations = join(process.cwd(), "src/prisma/migrations");
    for (const migration of readdirSync(migrations, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      db.exec(readFileSync(join(migrations, migration.name, "migration.sql"), "utf8"));
    }
    mkdirSync(join(root, "scripts"));
    const script = join(root, "scripts/seed-dashboard-preview.cjs");
    copyFileSync(join(process.cwd(), "scripts/seed-dashboard-preview.cjs"), script);
    const run = (args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd: root, env: { ...process.env, NODE_PATH: join(process.cwd(), "node_modules") }, encoding: "utf8" });
    const initial = run(["--preview-only"]);
    expect(initial.stderr).toBe("");
    expect(initial.status).toBe(0);
    expect(db.prepare("SELECT count(*) AS count FROM activity WHERE name LIKE 'Sample%'").get()).toEqual({ count: 20 });
    expect(db.pragma("foreign_key_check")).toEqual([]);
    const lines = db.prepare("SELECT id,calculatedBaseUnitQuantity FROM delivery_receipt_line").all() as { id: string; calculatedBaseUnitQuantity: string }[];
    for (const line of lines) {
      const allocations = db.prepare("SELECT quantity FROM issuance_receipt_allocation WHERE deliveryReceiptLineId=?").all(line.id) as { quantity: string }[];
      expect(allocations.reduce((sum, entry) => sum + Number(entry.quantity), 0)).toBeLessThanOrEqual(Number(line.calculatedBaseUnitQuantity));
    }
    expect(db.prepare("SELECT plannedBudgetCentavos FROM activity WHERE id LIKE '%-volunteers'").get()).toEqual({ plannedBudgetCentavos: null });
    expect(db.prepare("SELECT count(*) AS count FROM inventory_ledger_movement WHERE CAST(quantity AS REAL)<=0").get()).toEqual({ count: 0 });
    const movements = db.prepare("SELECT count(*) AS count FROM inventory_ledger_movement").get();
    expect(run(["--preview-only"]).status).toBe(0);
    expect(db.prepare("SELECT count(*) AS count FROM inventory_ledger_movement").get()).toEqual(movements);
    expect(run([]).status).not.toBe(0);
    expect(db.prepare("SELECT count(*) AS count FROM activity").get()).toEqual({ count: 20 });
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
}, 15_000);
