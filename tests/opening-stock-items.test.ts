import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { beginOpeningStock, createItemWithConversions, createItemUnitConversion, discardOpeningStockDraft, getOpeningStockWorkspace, listItems, saveOpeningStockDraft } from "@/features/supply-operations/server";
import type { ItemWithConversionsResult } from "@/features/supply-operations/item-with-conversions-types";

function item(result: ItemWithConversionsResult) { if (!result.ok) throw new Error(result.error); return result.item; }
async function fixture() {
  const key = crypto.randomUUID();
  const admin = { id: `create-admin-${key}`, name: "Item administrator", username: `create-admin-${key}` };
  const staff = { id: `create-staff-${key}`, name: "Kitchen staff", username: `create-staff-${key}` };
  await prisma.user.createMany({ data: [admin, staff].map((actor) => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  const category = await prisma.category.create({ data: { id: `create-cat-${key}`, name: `Create ${key}`, normalizedName: `create ${key}` } });
  const base = await prisma.unit.create({ data: { id: `create-base-${key}`, name: `Kilogram ${key}`, normalizedName: `kilogram ${key}`, abbreviation: `kg-${key}`, normalizedAbbreviation: `kg-${key}` } });
  const sack = await prisma.unit.create({ data: { id: `create-sack-${key}`, name: `Sack ${key}`, normalizedName: `sack ${key}`, abbreviation: `sack-${key}`, normalizedAbbreviation: `sack-${key}` } });
  const input = { item: { name: `Rice ${key}`, categoryId: category.id, baseUnitId: base.id, reorderLevel: "0.2500000000001", issuanceQuantityPolicy: "whole-numbers-only", note: "Keep dry" }, conversions: [{ alternateUnitId: sack.id, baseUnitQuantity: "25.000" }, { alternateUnitId: sack.id, baseUnitQuantity: "50" }] };
  return { admin, staff, base, sack, category, input };
}
beforeEach(async () => {
  await prisma.openingStockLine.deleteMany(); await prisma.openingStockDiscard.deleteMany(); await prisma.openingStockSetup.deleteMany();
});

describe("Opening Stock inline catalog creation", () => {
  it("creates the normal Item and multiple exact package sizes atomically without stock", async () => {
    const { admin, input } = await fixture();
    const created = item(await createItemWithConversions(admin, input));
    expect(created).toMatchObject({ name: input.item.name, reorderLevel: "0.2500000000001", issuanceQuantityPolicy: "whole-numbers-only", note: "Keep dry" });
    expect(created.unitConversions?.map((conversion) => conversion.baseUnitQuantity).sort()).toEqual(["25", "50"]);
    expect((await listItems()).find((entry) => entry.id === created.id)).toEqual(created);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });

  it("rejects normalized duplicate names, repeated package sizes and invalid normal fields", async () => {
    const { admin, input } = await fixture();
    item(await createItemWithConversions(admin, input));
    expect(await createItemWithConversions(admin, { ...input, item: { ...input.item, name: `  ${input.item.name.toUpperCase()}  ` } })).toMatchObject({ ok: false, kind: "duplicate", fields: { name: expect.any(Array) } });
    expect(await createItemWithConversions(admin, { ...input, item: { ...input.item, name: `Duplicate pack ${crypto.randomUUID()}` }, conversions: [input.conversions[0], { ...input.conversions[0], baseUnitQuantity: "25.0" }] })).toMatchObject({ ok: false, kind: "validation", fields: { "conversions.1.baseUnitQuantity": expect.any(Array) } });
    expect(await createItemWithConversions(admin, { item: { ...input.item, name: "", reorderLevel: "0", issuanceQuantityPolicy: "invalid" }, conversions: [] })).toMatchObject({ ok: false, kind: "validation", fields: { name: expect.any(Array), reorderLevel: expect.any(Array), issuanceQuantityPolicy: expect.any(Array) } });
  });

  it("rejects inactive or Base Unit alternate selections without partial creation", async () => {
    const { admin, input, sack, base, category } = await fixture();
    await prisma.unit.update({ where: { id: sack.id }, data: { active: false } });
    expect(await createItemWithConversions(admin, input)).toMatchObject({ ok: false, kind: "validation", fields: { "conversions.0.alternateUnitId": expect.any(Array) } });
    expect(await prisma.item.findFirst({ where: { name: input.item.name } })).toBeNull();
    expect(await createItemWithConversions(admin, { ...input, conversions: [{ alternateUnitId: base.id, baseUnitQuantity: "25" }] })).toMatchObject({ ok: false, kind: "validation" });
    await prisma.category.update({ where: { id: category.id }, data: { isActive: false } });
    expect(await createItemWithConversions(admin, { ...input, conversions: [] })).toMatchObject({ ok: false, fields: { categoryId: expect.any(Array) } });
    await prisma.unit.update({ where: { id: base.id }, data: { active: false } });
    expect(await createItemWithConversions(admin, { ...input, conversions: [] })).toMatchObject({ ok: false, fields: { baseUnitId: expect.any(Array) } });
  });

  it("rolls back Item creation if a conversion write fails", async () => {
    const { admin, input, sack } = await fixture();
    await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_inline_conversion BEFORE INSERT ON item_unit_conversion WHEN NEW.alternateUnitId = '${sack.id}' BEGIN SELECT RAISE(ABORT, 'forced conversion failure'); END`);
    try {
      await expect(createItemWithConversions(admin, input)).rejects.toThrow();
      expect(await prisma.item.findFirst({ where: { name: input.item.name } })).toBeNull();
    } finally { await prisma.$executeRawUnsafe("DROP TRIGGER reject_inline_conversion"); }
  });

  it("revalidates administrator permissions inside creation and existing-unit mutation", async () => {
    const { admin, staff, input, sack } = await fixture();
    expect(await createItemWithConversions(null, input)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await createItemWithConversions(staff, input)).toMatchObject({ ok: false, kind: "forbidden" });
    const created = item(await createItemWithConversions(admin, { ...input, conversions: [] }));
    await prisma.user.update({ where: { id: admin.id }, data: { disabled: true } });
    expect(await createItemWithConversions(admin, { ...input, item: { ...input.item, name: `Disabled ${crypto.randomUUID()}` } })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await createItemUnitConversion(admin, created.id, { alternateUnitId: sack.id, baseUnitQuantity: "25" })).toMatchObject({ ok: false, kind: "forbidden" });
  });

  it("preserves saved count quantities/conversions and catalog records through additions and discard", async () => {
    const { admin, input, sack } = await fixture();
    const created = item(await createItemWithConversions(admin, input));
    const begun = await beginOpeningStock(admin, { attemptId: crypto.randomUUID(), revision: 0 });
    if (!begun.ok) throw Error(begun.error);
    const workspace = await getOpeningStockWorkspace(admin);
    if (!workspace.ok) throw Error(workspace.error);
    const line = { id: crypto.randomUUID(), itemId: created.id, quantity: "3", selectedUnitId: sack.id, conversionId: created.unitConversions![0].id, openingUnitCost: "1250", zeroCostReason: "" };
    const saved = await saveOpeningStockDraft(admin, { attemptId: workspace.value.attemptId!, revision: begun.value.revision, countDate: workspace.value.countDate, note: "Count retained", lines: [line] });
    if (!saved.ok) throw Error(saved.error);
    expect(await createItemUnitConversion(admin, created.id, { alternateUnitId: sack.id, baseUnitQuantity: "75" })).toMatchObject({ ok: true });
    const reloaded = await getOpeningStockWorkspace(admin);
    if (!reloaded.ok) throw Error(reloaded.error);
    expect(reloaded.value.lines[0]).toMatchObject({ quantity: "3", openingUnitCost: "1250", conversionId: line.conversionId, conversionFactor: "25", calculatedBaseUnitQuantity: "75" });
    expect(reloaded.value.items.find((entry) => entry.id === created.id)?.unitConversions).toHaveLength(3);
    expect(await discardOpeningStockDraft(admin, { attemptId: workspace.value.attemptId!, revision: saved.value.revision })).toMatchObject({ ok: true });
    expect((await listItems()).find((entry) => entry.id === created.id)?.unitConversions).toHaveLength(3);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
});
