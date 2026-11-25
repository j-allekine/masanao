import { openingStockPostingFixture as fixture, openingStockValue as value } from "./helpers/opening-stock-fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/prisma/client";
import { deleteItem, getOpeningStockWorkspace, listInventory, listItems, postDeliveryReceipt, postOpeningStock, saveOpeningStockDraft, setItemActive, updateItem } from "@/features/supply-operations/server";
import { getIssuanceWorkspace, postIssuance, saveIssuanceDraft } from "@/features/issuance/server";
import { postIssuanceRecord } from "@/features/issuance/server/db/post";
import { postOpeningStockRecord } from "@/features/supply-operations/server/db/opening-stock";

beforeEach(async () => {
  await prisma.openingStockWithdrawal.deleteMany();
  await prisma.inventoryLedgerMovement.deleteMany();
  await prisma.openingStockSource.deleteMany();
  await prisma.openingStockLine.deleteMany(); await prisma.openingStockDiscard.deleteMany(); await prisma.openingStockSetup.deleteMany();
});

describe("Opening Stock posting and source integration", () => {
  it("retains same-Item line identity and order through removal/reordering, then issues mixed-unit cost layers exactly", async () => {
    const f = await fixture();
    const unit = await prisma.unit.create({ data: { id: crypto.randomUUID(), name: `Pack ${f.item.id}`, abbreviation: `p-${f.item.id}`, normalizedName: `pack ${f.item.id}`, normalizedAbbreviation: `p-${f.item.id}` } });
    const conversion = await prisma.itemUnitConversion.create({ data: { id: crypto.randomUUID(), itemId: f.item.id, alternateUnitId: unit.id, baseUnitQuantity: "3" } });
    const zero = { ...f.line, id: crypto.randomUUID(), quantity: "0.25", openingUnitCost: "0", zeroCostReason: "Supported assigned zero" };
    const pack = { ...f.line, id: crypto.randomUUID(), quantity: "1", selectedUnitId: unit.id, conversionId: conversion.id, openingUnitCost: "0.01" };
    let saved = await f.save({ lines: [f.line, zero, pack] });
    expect(value(await getOpeningStockWorkspace(f.admin)).lines.map((line) => line.id)).toEqual([f.line.id, zero.id, pack.id]);
    saved = value(await saveOpeningStockDraft(f.admin, { attemptId: f.attemptId, revision: saved.revision, countDate: f.countDate, note: "Reordered physical count", lines: [pack, zero] }));
    const count = value(await getOpeningStockWorkspace(f.admin));
    expect(count.lines).toMatchObject([{ id: pack.id, position: 0, calculatedBaseUnitQuantity: "3", lineAmount: "0.01" }, { id: zero.id, position: 1, calculatedBaseUnitQuantity: "0.25", lineAmount: "0", zeroCostReason: zero.zeroCostReason }]);
    const input = { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: true };
    expect(await postOpeningStock(f.admin, input)).toMatchObject({ ok: true });
    expect(await postOpeningStock(f.admin, input)).toMatchObject({ ok: true });
    expect(await prisma.openingStockSource.count()).toBe(2);
    const original = value(await getOpeningStockWorkspace(f.staff));
    expect(await postDeliveryReceipt(f.staff, f.receipt)).toMatchObject({ ok: true });
    const first = await f.issue("1"); if (!first.ok) throw Error(first.error);
    expect(first.value.review[0].openingAllocations).toMatchObject([{ linePosition: 0, quantity: "1", costCentavos: "0" }]);
    const mealId = crypto.randomUUID();
    await prisma.mealSchedule.create({ data: { id: mealId, activityId: f.context.activityId, label: "Second meal", mealTime: "13:00" } });
    const second = await f.issue("2.75", { ...f.context, mealScheduleId: mealId }); if (!second.ok) throw Error(second.error);
    expect(second.value.review[0]).toMatchObject({ openingAllocations: [{ linePosition: 0, quantity: "2", costCentavos: "1" }, { linePosition: 1, quantity: "0.25", costCentavos: "0" }], receiptAllocations: [{ quantity: "0.5" }] });
    expect(await f.report()).toMatchObject({ cost: "3001" });
    expect(await getIssuanceWorkspace(f.staff, f.context)).toEqual(first);
    expect(value(await getOpeningStockWorkspace(f.staff)).lines).toEqual(original.lines);
    const inventory = await listInventory(f.staff); if (!inventory.ok) throw Error(inventory.error);
    expect(inventory.rows.find((row) => row.id === f.item.id)?.balance).toEqual({ kind: "valid", quantity: "24.5" });
    expect(await saveOpeningStockDraft(f.admin, { attemptId: f.attemptId, revision: saved.revision, countDate: f.countDate, note: "", lines: [zero] })).toMatchObject({ ok: false, kind: "conflict" });
  });

  it("rejects duplicate line identities while allowing incomplete same-Item cost lines", async () => {
    const f = await fixture();
    expect(await saveOpeningStockDraft(f.admin, { attemptId: f.attemptId, revision: f.begun.revision, countDate: f.countDate, note: "", lines: [f.line, { ...f.line, openingUnitCost: "2" }] })).toMatchObject({ ok: false, kind: "validation" });
    const saved = await f.save({ lines: [f.line, { ...f.line, id: crypto.randomUUID(), quantity: "", openingUnitCost: "" }] });
    expect(value(await getOpeningStockWorkspace(f.admin)).lines).toHaveLength(2);
    expect(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: true })).toMatchObject({ ok: false, kind: "validation" });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });

  it("posts once, consumes opening before a later receipt, and reports exact mixed-source costs", async () => {
    const f = await fixture(); const saved = await f.save();
    const request = { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false };
    expect(await postOpeningStock(f.staff, request)).toMatchObject({ ok: false, kind: "forbidden" });
    const posted = value(await postOpeningStock(f.admin, request));
    expect(await postOpeningStock(f.admin, request)).toEqual({ ok: true, value: posted });
    expect(value(await getOpeningStockWorkspace(f.staff))).toMatchObject({ status: "posted", reference: "OS-0001", postedByName: f.admin.name, lines: [{ calculatedBaseUnitQuantity: "75", lineAmount: "3750" }] });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(1);
    expect(await postDeliveryReceipt(f.staff, f.receipt)).toMatchObject({ ok: true });
    const issued = await f.issue("80"); if (!issued.ok) throw Error(issued.error);
    expect(issued.value.review[0]).toMatchObject({ openingAllocations: [{ quantity: "75", reference: "OS-0001", costCentavos: "375000", sequence: 1 }], receiptAllocations: [{ quantity: "5", purchaseOrderNo: expect.stringMatching(/^PO-/) }] });
    const inventory = await listInventory(f.staff); if (!inventory.ok) throw Error(inventory.error);
    expect(inventory.rows.find((row) => row.id === f.item.id)?.balance).toEqual({ kind: "valid", quantity: "20" });
    expect(await f.report()).toMatchObject({ cost: "405000", variance: "595000" });
    expect(await getIssuanceWorkspace(f.staff, f.context)).toEqual(issued);
    const retry = await postIssuance(f.staff, f.context, { revision: 1 }); expect(retry).toEqual(issued);
    expect(await prisma.openingStockWithdrawal.count()).toBe(1);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(3);
  });

  it("distinguishes unknown and intentional zero costs, preserving exact fractional source evidence", async () => {
    const f = await fixture();
    let saved = await f.save({ lines: [{ ...f.line, quantity: "0.123456789123456789", openingUnitCost: "" }] });
    expect(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: true })).toMatchObject({ ok: false, kind: "validation" });
    saved = value(await saveOpeningStockDraft(f.admin, { attemptId: f.attemptId, revision: saved.revision, countDate: f.countDate, note: "", lines: [{ ...f.line, quantity: "0.123456789123456789", openingUnitCost: "0", zeroCostReason: "Assigned zero value" }] }));
    expect(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false })).toMatchObject({ ok: false, kind: "validation" });
    value(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: true }));
    const issued = await f.issue("0.123456789123456789"); if (!issued.ok) throw Error(issued.error);
    expect(issued.value.review[0]).toMatchObject({ openingAllocations: [{ quantity: "0.123456789123456789", costCentavos: "0" }], receiptAllocations: [] });
    expect(await f.report()).toMatchObject({ cost: "0" });
    expect(await prisma.openingStockWithdrawal.findFirst()).toMatchObject({ beforeQuantity: "0", afterQuantity: "0.123456789123456789", costCentavos: "0" });
  });

  it("rolls back every stock effect if posting fails after the first movement", async () => {
    const f = await fixture(); const saved = await f.save();
    await expect(postOpeningStockRecord(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false }, { afterFirstMovement: () => { throw Error("Injected rollback"); } })).rejects.toThrow("Injected rollback");
    expect(await prisma.openingStockSource.count()).toBe(0);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
    expect(value(await getOpeningStockWorkspace(f.admin))).toMatchObject({ status: "draft", revision: saved.revision });
    expect(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false })).toMatchObject({ ok: true });
  });

  it("uses posting chronology, blocks earlier receipts and protects opening-only Items", async () => {
    const f = await fixture(); const saved = await f.save();
    value(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false }));
    expect(await postDeliveryReceipt(f.staff, { ...f.receipt, receiptDate: "2000-01-01" })).toMatchObject({ ok: false });
    expect(await setItemActive(f.admin, f.item.id, false)).toEqual({ ok: false, kind: "referenced", error: "This Item cannot be deactivated because posted Opening Stock references it." });
    expect(await deleteItem(f.admin, f.item.id)).toMatchObject({ ok: false });
    const item = (await listItems()).find((entry) => entry.id === f.item.id)!;
    expect(item).toMatchObject({ hasPostedOpeningStock: true, hasPostedDeliveryReceiptLines: false });
    expect(await updateItem(f.admin, f.item.id, { name: item.name, categoryId: item.category.id, baseUnitId: "default-unit-piece", reorderLevel: "10", reorderLevelBaseUnitId: "default-unit-piece", note: "" })).toMatchObject({ ok: false });
    await prisma.activity.update({ where: { id: f.context.activityId }, data: { scheduledDate: new Date("2000-01-01") } });
    const issued = await f.issue("1"); if (!issued.ok) throw Error(issued.error);
    expect(issued.value.review[0].openingAllocations?.[0].quantity).toBe("1");
    const before = issued.value;
    await prisma.item.update({ where: { id: f.item.id }, data: { name: "Renamed later" } });
    expect(await getIssuanceWorkspace(f.staff, f.context)).toEqual({ ok: true, value: before });
    expect(value(await getOpeningStockWorkspace(f.staff)).lines[0].itemName).toBe(item.name);
  });

  it("freezes cumulative centavos and sequence across repeated fractional source issues", async () => {
    const f = await fixture();
    const unit = await prisma.unit.create({ data: { id: crypto.randomUUID(), name: `Bundle ${f.item.id}`, abbreviation: `b-${f.item.id}`, normalizedName: `bundle ${f.item.id}`, normalizedAbbreviation: `b-${f.item.id}` } });
    const conversion = await prisma.itemUnitConversion.create({ data: { id: crypto.randomUUID(), itemId: f.item.id, alternateUnitId: unit.id, baseUnitQuantity: "3" } });
    const saved = await f.save({ lines: [{ ...f.line, quantity: "1", selectedUnitId: unit.id, conversionId: conversion.id, openingUnitCost: "0.01" }] });
    value(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false }));
    const costs = [];
    for (let index = 0; index < 3; index++) {
      const mealId = crypto.randomUUID();
      await prisma.mealSchedule.create({ data: { id: mealId, activityId: f.context.activityId, label: `Meal ${index}`, mealTime: "12:00" } });
      const issued = await f.issue("1", { ...f.context, mealScheduleId: mealId }); if (!issued.ok) throw Error(issued.error);
      costs.push(issued.value.review[0].openingAllocations?.[0].costCentavos);
    }
    expect(costs).toEqual(["0", "1", "0"]);
    expect(await prisma.openingStockWithdrawal.findMany({ orderBy: { sequence: "asc" }, select: { beforeQuantity: true, afterQuantity: true, sequence: true } })).toEqual([
      { beforeQuantity: "0", afterQuantity: "1", sequence: 1 }, { beforeQuantity: "1", afterQuantity: "2", sequence: 2 }, { beforeQuantity: "2", afterQuantity: "3", sequence: 3 },
    ]);
    expect(await f.report()).toMatchObject({ cost: "1" });
    const inventory = await listInventory(f.staff); if (!inventory.ok) throw Error(inventory.error);
    expect(inventory.rows.find((row) => row.id === f.item.id)?.balance).toEqual({ kind: "valid", quantity: "0" });
  });

  it("keeps the selected Manila count date when a saved draft posts after midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-11-20T15:59:00.000Z"));
      const f = await fixture();
      const saved = await f.save({ countDate: "2026-11-20" });
      vi.setSystemTime(new Date("2026-11-20T16:01:00.000Z"));
      value(await postOpeningStock(f.admin, { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false }));
      expect(value(await getOpeningStockWorkspace(f.staff))).toMatchObject({ countDate: "2026-11-20", postedAt: "2026-11-20T16:01:00.000Z" });
      expect(await postDeliveryReceipt(f.staff, { ...f.receipt, receiptDate: "2026-11-19" })).toMatchObject({ ok: false });
      expect(await postDeliveryReceipt(f.staff, { ...f.receipt, receiptDate: "2026-11-20" })).toMatchObject({ ok: true });
      const issued = await f.issue("1");
      expect(issued).toMatchObject({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("rolls back opening withdrawals when issuance fails and rejects future dates or stale source references", async () => {
    const f = await fixture(); const saved = await f.save();
    await prisma.openingStockSetup.update({ where: { id: "opening-stock" }, data: { countDate: "2999-01-01" } });
    const input = { attemptId: f.attemptId, revision: saved.revision, zeroCostAcknowledged: false };
    expect(await postOpeningStock(f.admin, input)).toMatchObject({ ok: false, kind: "validation" });
    await prisma.openingStockSetup.update({ where: { id: "opening-stock" }, data: { countDate: f.countDate } });
    await prisma.item.update({ where: { id: f.item.id }, data: { isActive: false } });
    expect(await postOpeningStock(f.admin, input)).toMatchObject({ ok: false, kind: "reference" });
    await prisma.item.update({ where: { id: f.item.id }, data: { isActive: true } });
    value(await postOpeningStock(f.admin, input));
    const draft = await saveIssuanceDraft(f.staff, f.context, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: f.item.id, conversionId: null, enteredQuantity: "2" }] });
    if (!draft.ok) throw Error(draft.error);
    await expect(postIssuanceRecord(f.staff, f.context, draft.value.draft.revision, prisma, { afterFirstMovement: () => { throw Error("Rollback source allocation"); } })).rejects.toThrow("Rollback source allocation");
    expect(await prisma.openingStockWithdrawal.count()).toBe(0);
    expect(await prisma.inventoryLedgerMovement.count({ where: { movementType: "stock-out" } })).toBe(0);
    expect(await postIssuance(f.staff, f.context, { revision: draft.value.draft.revision })).toMatchObject({ ok: true });
  });
});
