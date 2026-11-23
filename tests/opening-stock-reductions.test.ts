import { openingStockRemainingFixture, openingStockValue as value } from "./helpers/opening-stock-fixtures";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { beginOpeningStockCorrection, discardOpeningStockCorrection, getOpeningStockWorkspace, postOpeningStockCorrection, saveOpeningStockCorrection } from "@/features/supply-operations/server";
import { getIssuanceWorkspace } from "@/features/issuance/server";
import { postOpeningStockCorrectionRecord } from "@/features/supply-operations/server/db/opening-stock-corrections";

type ReductionLine = { id: string; sourceId: string; quantity: string };
async function fixture() {
  const base = await openingStockRemainingFixture();
  const { admin } = base;
  const reduce = async (lines: ReductionLine[], reason = "Physical count included excess stock") => {
    const id = crypto.randomUUID(); const begun = value(await beginOpeningStockCorrection(admin, { id, kind: "reduce-remaining" }));
    const input = { id, revision: begun.revision, reason, note: "Discovery note; effective date is assigned on posting", lines };
    const saved = value(await saveOpeningStockCorrection(admin, input));
    return { id, input, saved, post: { id, revision: saved.revision, zeroCostAcknowledged: false } };
  };
  return { ...base, reduce };
}

beforeEach(async () => {
  await prisma.inventoryLedgerMovement.deleteMany(); await prisma.openingStockWithdrawal.deleteMany(); await prisma.openingStockCorrectionLine.updateMany({ data: { sourceId: null } }); await prisma.openingStockSource.deleteMany(); await prisma.openingStockCorrectionLine.deleteMany(); await prisma.openingStockCorrection.deleteMany(); await prisma.openingStockLine.deleteMany(); await prisma.openingStockDiscard.deleteMany(); await prisma.openingStockSetup.deleteMany();
});

describe("Remaining Opening Stock quantity reductions", () => {
  it("shares committed centavo consumption with issuance, excludes retirement from meal cost, and freezes old evidence", async () => {
    const f = await fixture();
    const unit = await prisma.unit.create({ data: { id: crypto.randomUUID(), name: `Pack ${f.item.id}`, abbreviation: `p-${f.item.id}`, normalizedName: `pack ${f.item.id}`, normalizedAbbreviation: `p-${f.item.id}` } });
    const conversion = await prisma.itemUnitConversion.create({ data: { id: crypto.randomUUID(), itemId: f.item.id, alternateUnitId: unit.id, baseUnitQuantity: "3" } });
    const original = await f.postCount([{ ...f.line, selectedUnitId: unit.id, conversionId: conversion.id, quantity: "1", openingUnitCost: "0.01" }]);
    const first = await f.issue("1");
    expect(first.result.value.review[0].openingAllocations).toMatchObject([{ quantity: "1", sequence: 1, costCentavos: "0" }]);
    const source = value(await getOpeningStockWorkspace(f.admin)).sources![0];
    const c = await f.reduce([{ id: crypto.randomUUID(), sourceId: source.id, quantity: "1" }]);
    expect(c.saved.correction).toMatchObject({ kind: "reduce-remaining", lines: [{ sourceId: source.id, beforeQuantity: "2", beforeValueCentavos: "1", afterQuantity: "1", afterValueCentavos: "0" }] });
    const before = Date.now(); const posted = value(await postOpeningStockCorrection(f.admin, c.post));
    expect(await postOpeningStockCorrection(f.admin, c.post)).toEqual({ ok: true, value: posted });
    const corrected = value(await getOpeningStockWorkspace(f.staff));
    expect(corrected.lines).toEqual(original.lines);
    expect(corrected.sources).toMatchObject([{ id: source.id, quantity: "3", remainingQuantity: "1", remainingValueCentavos: "0" }]);
    expect(corrected.corrections).toMatchObject([{ status: "posted", kind: "reduce-remaining", postedByName: f.admin.name, reason: c.input.reason }]);
    expect(Date.parse(corrected.corrections![0].postedAt!)).toBeGreaterThanOrEqual(before);
    expect(await getIssuanceWorkspace(f.staff, first.meal)).toEqual(first.result);
    expect(await f.report()).toMatchObject({ cost: "0" });
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "1" });
    const final = await f.issue("1");
    expect(final.result.value.review[0].openingAllocations).toMatchObject([{ quantity: "1", sequence: 3, costCentavos: "0" }]);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "0" });
    expect(await f.report()).toMatchObject({ cost: "0" });
    expect(await getIssuanceWorkspace(f.staff, first.meal)).toEqual(first.result);
    const withdrawals = await prisma.openingStockWithdrawal.findMany({ where: { sourceId: source.id }, orderBy: { sequence: "asc" } });
    expect(withdrawals.map(w => [w.kind, w.sequence, w.beforeQuantity, w.afterQuantity, w.costCentavos])).toEqual([["issuance", 1, "0", "1", "0"], ["correction-retirement", 2, "1", "2", "1"], ["issuance", 3, "2", "3", "0"]]);
    expect(withdrawals[1]).toMatchObject({ issuanceItemTotalId: null, correctionLineId: c.input.lines[0].id });
    expect(withdrawals.reduce((sum, w) => sum + BigInt(w.costCentavos), BigInt(0))).toBe(BigInt(1));
    expect(await prisma.openingStockSource.findUnique({ where: { id: source.id } })).toMatchObject({ quantity: "3", amount: "0.01" });
  });

  it("targets distinct same-Item sources without borrowing receipt or sibling capacity", async () => {
    const f = await fixture();
    const original = await f.postCount([{ ...f.line, quantity: "2", openingUnitCost: "3" }, { ...f.line, id: crypto.randomUUID(), quantity: "20", openingUnitCost: "4" }]);
    expect(await f.receipt()).toMatchObject({ ok: true });
    const [first, second] = original.sources!;
    const excessive = await f.reduce([{ id: crypto.randomUUID(), sourceId: first.id, quantity: "" }]);
    expect(await saveOpeningStockCorrection(f.admin, { ...excessive.input, revision: excessive.saved.revision, lines: [{ ...excessive.input.lines[0], quantity: "3" }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "47" });
    const saved = value(await saveOpeningStockCorrection(f.admin, { ...excessive.input, revision: excessive.saved.revision, lines: [{ id: excessive.input.lines[0].id, sourceId: first.id, quantity: "2" }, { id: crypto.randomUUID(), sourceId: second.id, quantity: "0.123456789123456789" }] }));
    expect(saved.correction.lines).toMatchObject([{ sourceId: first.id, beforeQuantity: "2", beforeValueCentavos: "600", afterQuantity: "0", afterValueCentavos: "0" }, { sourceId: second.id, beforeQuantity: "20", afterQuantity: "19.876543210876543211" }]);
    value(await postOpeningStockCorrection(f.admin, { ...excessive.post, revision: saved.revision }));
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "44.876543210876543211" });
    const history = value(await getOpeningStockWorkspace(f.staff));
    expect(history.lines).toEqual(original.lines);
    expect(history.sources).toMatchObject([{ id: first.id, remainingQuantity: "0" }, { id: second.id, remainingQuantity: "19.876543210876543211" }]);
    const invalid = await beginOpeningStockCorrection(f.admin, { id: crypto.randomUUID(), kind: "reduce-remaining" });
    const draft = value(invalid);
    expect(await saveOpeningStockCorrection(f.admin, { id: draft.correction.id, revision: draft.revision, reason: "Wrong source", note: "", lines: [{ id: crypto.randomUUID(), sourceId: "delivery-or-unrelated-source", quantity: "1" }] })).toMatchObject({ ok: false, kind: "reference" });
  });

  it("requires review again after issuance or another correction and leaves drafts non-reserving", async () => {
    const f = await fixture(); const source = (await f.postCount()).sources![0];
    const c = await f.reduce([{ id: crypto.randomUUID(), sourceId: source.id, quantity: "4" }]);
    expect(value(await getOpeningStockWorkspace(f.staff)).corrections).toEqual([]);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "10" });
    await f.issue("1");
    expect(await postOpeningStockCorrection(f.admin, c.post)).toMatchObject({ ok: false, kind: "conflict" });
    const saved = value(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: c.saved.revision }));
    expect(saved.correction.lines).toMatchObject([{ beforeQuantity: "9", afterQuantity: "5" }]);
    const other = await f.reduce([{ id: crypto.randomUUID(), sourceId: source.id, quantity: "1" }]);
    value(await postOpeningStockCorrection(f.admin, other.post));
    expect(await postOpeningStockCorrection(f.admin, { ...c.post, revision: saved.revision })).toMatchObject({ ok: false, kind: "conflict" });
    const reviewed = value(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: saved.revision }));
    value(await postOpeningStockCorrection(f.admin, { ...c.post, revision: reviewed.revision }));
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "4" });
  });

  it("keeps a reviewed reduction valid when only unrelated same-Item capacity changes", async () => {
    const f = await fixture();
    const original = await f.postCount([{ ...f.line, quantity: "2", openingUnitCost: "3" }, { ...f.line, id: crypto.randomUUID(), quantity: "5", openingUnitCost: "4" }]);
    const target = original.sources![1];
    const c = await f.reduce([{ id: crypto.randomUUID(), sourceId: target.id, quantity: "2" }]);
    expect(c.saved.correction.lines).toMatchObject([{ sourceId: target.id, beforeQuantity: "5", beforeValueCentavos: "2000", afterQuantity: "3", afterValueCentavos: "1200" }]);
    const earlier = await f.issue("1");
    expect(earlier.result.value.review[0].openingAllocations).toMatchObject([{ sourceId: original.sources![0].id, quantity: "1" }]);
    expect(await f.receipt()).toMatchObject({ ok: true });
    value(await postOpeningStockCorrection(f.admin, c.post));
    expect(value(await getOpeningStockWorkspace(f.staff)).sources).toMatchObject([{ remainingQuantity: "1" }, { id: target.id, remainingQuantity: "3", remainingValueCentavos: "1200" }]);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "29" });
    expect(await getIssuanceWorkspace(f.staff, earlier.meal)).toEqual(earlier.result);
  });

  it("rolls back all reduction evidence on failure and makes successful retries idempotent", async () => {
    const f = await fixture(); const original = await f.postCount([{ ...f.line, quantity: "2" }, { ...f.line, id: crypto.randomUUID(), quantity: "3" }]);
    const c = await f.reduce(original.sources!.map(s => ({ id: crypto.randomUUID(), sourceId: s.id, quantity: "1" })));
    await expect(postOpeningStockCorrectionRecord(f.admin, c.post, { afterFirstMovement: () => { throw Error("Rollback reduction"); } })).rejects.toThrow("Rollback reduction");
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "5" });
    expect(await prisma.openingStockWithdrawal.count()).toBe(0);
    expect(value(await getOpeningStockWorkspace(f.admin)).corrections).toMatchObject([{ status: "draft", revision: c.saved.revision }]);
    const posted = value(await postOpeningStockCorrection(f.admin, c.post));
    expect(await postOpeningStockCorrection(f.admin, c.post)).toEqual({ ok: true, value: posted });
    expect(await prisma.openingStockWithdrawal.count()).toBe(2);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(4);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "3" });
    expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: posted.revision })).toMatchObject({ ok: false, kind: "conflict" });
    expect(await discardOpeningStockCorrection(f.admin, { id: c.id, revision: posted.revision })).toMatchObject({ ok: false, kind: "conflict" });
  });

  it("retains incomplete reduction drafts, rejects client price/date overrides, and rechecks persisted actors", async () => {
    const f = await fixture(); const source = (await f.postCount()).sources![0];
    const c = await f.reduce([{ id: crypto.randomUUID(), sourceId: source.id, quantity: "" }], "");
    expect(value(await getOpeningStockWorkspace(f.admin)).corrections).toMatchObject([{ lines: [{ quantity: "" }], reason: "" }]);
    expect(await postOpeningStockCorrection(f.admin, c.post)).toMatchObject({ ok: false, kind: "validation" });
    for (const quantity of ["0", "-1"]) expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: c.saved.revision, lines: [{ ...c.input.lines[0], quantity }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await saveOpeningStockCorrection(f.admin, { ...c.input, revision: c.saved.revision, lines: [{ ...c.input.lines[0], quantity: "1", openingUnitCost: "0" }] })).toMatchObject({ ok: false, kind: "validation" });
    for (const effectiveDate of ["2000-01-01", "2999-01-01"]) expect(await postOpeningStockCorrection(f.admin, { ...c.post, effectiveDate })).toMatchObject({ ok: false, kind: "validation" });
    expect(await beginOpeningStockCorrection(f.staff, { id: crypto.randomUUID(), kind: "reduce-remaining" })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await saveOpeningStockCorrection(f.staff, { ...c.input, revision: c.saved.revision })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await postOpeningStockCorrection(f.staff, c.post)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await discardOpeningStockCorrection(f.staff, { id: c.id, revision: c.saved.revision })).toMatchObject({ ok: false, kind: "forbidden" });
    await prisma.user.update({ where: { id: f.admin.id }, data: { disabled: true } });
    expect(await postOpeningStockCorrection(f.admin, c.post)).toMatchObject({ ok: false, kind: "forbidden" });
    await prisma.user.update({ where: { id: f.admin.id }, data: { disabled: false } });
    const discarded = await discardOpeningStockCorrection(f.admin, { id: c.id, revision: c.saved.revision });
    expect(discarded).toMatchObject({ ok: true });
    expect(await discardOpeningStockCorrection(f.admin, { id: c.id, revision: c.saved.revision })).toEqual(discarded);
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "10" });
  });

  it("retires zero-valued exact fractional quantities through repeated reductions and final exhaustion", async () => {
    const f = await fixture(); const source = (await f.postCount([{ ...f.line, quantity: "0.123456789123456789", openingUnitCost: "0", zeroCostReason: "Supported deliberate zero" }])).sources![0];
    const first = await f.reduce([{ id: crypto.randomUUID(), sourceId: source.id, quantity: "0.1" }]);
    expect(first.saved.correction.lines).toMatchObject([{ beforeValueCentavos: "0", afterQuantity: "0.023456789123456789", afterValueCentavos: "0" }]);
    value(await postOpeningStockCorrection(f.admin, first.post));
    const last = await f.reduce([{ id: crypto.randomUUID(), sourceId: source.id, quantity: "0.023456789123456789" }]);
    value(await postOpeningStockCorrection(f.admin, last.post));
    expect(await f.inventory()).toEqual({ kind: "valid", quantity: "0" });
    const excess = await f.reduce([{ id: crypto.randomUUID(), sourceId: source.id, quantity: "" }]);
    expect(await saveOpeningStockCorrection(f.admin, { ...excess.input, revision: excess.saved.revision, lines: [{ ...excess.input.lines[0], quantity: "0.000000000000000001" }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(value(await getOpeningStockWorkspace(f.staff)).sources).toMatchObject([{ quantity: "0.123456789123456789", remainingQuantity: "0", remainingValueCentavos: "0" }]);
    expect((await prisma.openingStockWithdrawal.findMany({ orderBy: { sequence: "asc" } })).map(w => [w.quantity, w.costCentavos])).toEqual([["0.1", "0"], ["0.023456789123456789", "0"]]);
  });
});
