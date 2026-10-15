import Database from "better-sqlite3";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { describe, expect, it } from "vitest";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { postIssuanceRecord } from "@/features/issuance/server/db/post";
import type { IssuanceContext, IssuanceResult, IssuanceWorkspace } from "@/features/issuance/types";

type Event = { state: string; result?: IssuanceResult<IssuanceWorkspace>; message?: string };
function worker(url: string, timeout = 2000) {
  const child = spawn(process.execPath, ["--experimental-transform-types", join(process.cwd(), "tests/fixtures/issuance-post-worker.mjs")], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url, POST_TEST_TIMEOUT: String(timeout) }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let stderr = ""; child.stderr!.on("data", (chunk) => { stderr += chunk.toString(); });
  const backlog: Event[] = []; const waiting: { state: string; resolve: (event: Event) => void; reject: (error: Error) => void }[] = [];
  child.on("message", (raw) => { const event = raw as Event; const waiter = waiting.find((entry) => entry.state === event.state || event.state === "error"); if (!waiter) backlog.push(event); else { waiting.splice(waiting.indexOf(waiter), 1); if (event.state === "error") waiter.reject(new Error(event.message)); else waiter.resolve(event); } });
  child.on("exit", (code) => { for (const waiter of waiting.splice(0)) waiter.reject(new Error(`Posting child exited (${code}): ${stderr}`)); });
  return { child, wait: (state: string) => { const index = backlog.findIndex((event) => event.state === state || event.state === "error"); if (index >= 0) { const event = backlog.splice(index, 1)[0]; return event.state === "error" ? Promise.reject(new Error(event.message)) : Promise.resolve(event); } return new Promise<Event>((resolve, reject) => waiting.push({ state, resolve, reject })); } };
}
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "masanao-post-race-")); const path = join(directory, "shared.db"); const sqlite = new Database(path);
  const migrations = join(process.cwd(), "src/prisma/migrations");
  for (const name of readdirSync(migrations, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) sqlite.exec(readFileSync(join(migrations, name, "migration.sql"), "utf8"));
  sqlite.exec(`
    INSERT INTO user (id,name,email,username,role,updatedAt) VALUES ('race-staff','Staff','race@test.local','racestaff','staff',CURRENT_TIMESTAMP);
    INSERT INTO unit (id,name,abbreviation,normalizedName,normalizedAbbreviation,updatedAt) VALUES ('race-unit','Race piece','racepc','race piece','racepc',CURRENT_TIMESTAMP);
    INSERT INTO category (id,name,normalizedName,updatedAt) VALUES ('race-category','Race food','race food',CURRENT_TIMESTAMP);
    INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,issuanceQuantityPolicy,updatedAt) VALUES ('race-item','Eggs','race eggs','race-category','race-unit','whole-only',CURRENT_TIMESTAMP);
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,updatedAt) VALUES ('race-design','AD-RACE',2026,'Race event',CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,plannedParticipantCount,updatedAt) VALUES ('race-activity','race-design','Training','Kitchen',CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP);
    INSERT INTO vendor (id,name,normalizedName,updatedAt) VALUES ('race-vendor','Race supplier','race supplier',CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,updatedAt) VALUES ('race-po','PO-RACE','po-race','race-vendor',CURRENT_TIMESTAMP);
    INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate) VALUES ('race-receipt','race-po','race-vendor','Race supplier','PO-RACE','DR-RACE','dr-race',CURRENT_TIMESTAMP);
    INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity) VALUES ('race-receipt-line','race-receipt','race-item','race-unit','race-unit','Eggs','Piece','Piece','20','1','20');
    INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('race-stock-in','race-receipt-line','race-item','race-unit','20','stock-in',CURRENT_TIMESTAMP);
  `);
  for (const number of [1, 2]) sqlite.exec(`
    INSERT INTO meal_schedule (id,activityId,label,mealTime,updatedAt) VALUES ('race-meal-${number}','race-activity','Lunch ${number}','12:00',CURRENT_TIMESTAMP);
    INSERT INTO issuance_record (id,mealScheduleId,mealPax,updatedAt) VALUES ('race-record-${number}','race-meal-${number}',1,CURRENT_TIMESTAMP);
    INSERT INTO issuance_stock_item (id,issuanceRecordId,itemId,itemName,enteredQuantity,conversionFactor,selectedUnitId,selectedUnitName,selectedUnitAbbreviation,baseUnitId,baseUnitName,baseUnitAbbreviation) VALUES ('race-stock-${number}','race-record-${number}','race-item','Eggs','15','1','race-unit','Race piece','racepc','race-unit','Race piece','racepc');
    INSERT INTO issuance_item_total (id,issuanceRecordId,itemId,calculatedNumerator,calculatedDenominator,finalQuantity) VALUES ('race-total-${number}','race-record-${number}','race-item','15','1','15');
  `);
  sqlite.close(); const url = `file:${path.replaceAll("\\", "/")}`;
  const database = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  return { directory, url, database };
}
function context(number: number): IssuanceContext { return { activityDesignId: "race-design", activityId: "race-activity", mealScheduleId: `race-meal-${number}` }; }
const actor = { id: "race-staff", name: "Staff", username: "racestaff" };
async function closeChildren(children: ChildProcess[]) {
  await Promise.all(children.map(async (child) => { if (child.exitCode !== null) return; const exited = new Promise<void>((resolve) => child.once("exit", () => resolve())); child.kill(); await exited; }));
}
describe("Posting with independent SQLite processes on one isolated database", () => {
  it("serializes competing records without overspending, and retry sees committed shortage", async () => {
    const { database, url, directory } = fixture(); const workers = [worker(url), worker(url)];
    try {
      await Promise.all(workers.map((entry) => entry.wait("ready")));
      workers.forEach((entry, index) => entry.child.send({ context: context(index + 1) }));
      const outcomes = (await Promise.all(workers.map((entry) => entry.wait("result")))).map((event) => event.result!);
      expect(outcomes.filter((result) => result.ok)).toHaveLength(1);
      const loser = outcomes.findIndex((result) => !result.ok);
      expect(outcomes[loser]).toMatchObject({ ok: false, kind: expect.stringMatching(/shortage|busy/) });
      expect(await postIssuanceRecord(actor, context(loser + 1), 1, database)).toMatchObject({ ok: false, kind: "shortage" });
      expect(await database.inventoryLedgerMovement.findMany({ where: { movementType: "stock-out" } })).toHaveLength(1);
      expect(await database.inventoryLedgerMovement.findFirst({ where: { movementType: "stock-out" } })).toMatchObject({ quantity: "15" });
      expect(await database.issuanceReceiptAllocation.findMany()).toMatchObject([{ quantity: "15", basis: "fifo" }]);
      expect(await database.issuanceRecord.findUnique({ where: { id: `race-record-${loser + 1}` } })).toMatchObject({ revision: 1, status: "draft", postingEvidence: null });
      const movements = await database.inventoryLedgerMovement.findMany(); expect(movements.reduce((balance, row) => balance + (row.movementType === "stock-in" ? 1 : -1) * Number(row.quantity), 0)).toBe(5);
    } finally { await closeChildren(workers.map((entry) => entry.child)); await database.$disconnect(); rmSync(directory, { recursive: true, force: true }); }
  }, 30000);
  it("returns the same posted result for concurrent same-record retries, with one movement", async () => {
    const { database, url, directory } = fixture(); const workers = [worker(url), worker(url)];
    try {
      await Promise.all(workers.map((entry) => entry.wait("ready"))); workers.forEach((entry) => entry.child.send({ context: context(1) }));
      const outcomes = (await Promise.all(workers.map((entry) => entry.wait("result")))).map((event) => event.result!);
      expect(outcomes.filter((result) => result.ok).length).toBeGreaterThan(0);
      const posted = outcomes.find((result) => result.ok)!;
      expect(await postIssuanceRecord(actor, context(1), 1, database)).toEqual(posted);
      for (const result of outcomes.filter((result) => result.ok)) expect(result).toEqual(posted);
      expect(await database.inventoryLedgerMovement.count({ where: { movementType: "stock-out" } })).toBe(1);
    } finally { await closeChildren(workers.map((entry) => entry.child)); await database.$disconnect(); rmSync(directory, { recursive: true, force: true }); }
  }, 30000);
  it("reports deterministic busy contention, rolls back loser, and retries after writer commits", async () => {
    const { database, url, directory } = fixture(); const holder = worker(url); const contender = worker(url, 0);
    try {
      await Promise.all([holder.wait("ready"), contender.wait("ready")]); holder.child.send({ context: context(1), hold: true }); await holder.wait("locked");
      contender.child.send({ context: context(2) }); expect((await contender.wait("result")).result).toMatchObject({ ok: false, kind: "busy" });
      holder.child.send({ release: true }); expect((await holder.wait("result")).result).toMatchObject({ ok: true });
      expect(await postIssuanceRecord(actor, context(2), 1, database)).toMatchObject({ ok: false, kind: "shortage" });
      expect(await database.issuanceRecord.findUnique({ where: { id: "race-record-2" } })).toMatchObject({ revision: 1, status: "draft", postedAt: null });
      expect(await database.inventoryLedgerMovement.count({ where: { movementType: "stock-out" } })).toBe(1);
    } finally { await closeChildren([holder.child, contender.child]); await database.$disconnect(); rmSync(directory, { recursive: true, force: true }); }
  }, 30000);
});
