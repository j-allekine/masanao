import { beforeEach, describe, expect, it } from "vitest";
import { getIssuanceWorkspace, postIssuance, previewIssuanceRecipe, saveIssuanceDraft } from "@/features/issuance/server";
import { postIssuanceRecord } from "@/features/issuance/server/db/post";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import type { IssuanceResult, IssuanceWorkspace } from "@/features/issuance/types";
import { deleteMealSchedule } from "@/features/activity-planning/server";
import { deleteRecipe } from "@/features/recipes/server";
import { deleteItem, postDeliveryReceipt } from "@/features/supply-operations/server";

const staff: CurrentActor = { id: "post-staff", name: "Kitchen staff", username: "poststaff" };
const admin: CurrentActor = { id: "post-admin", name: "Administrator", username: "postadmin" };
const context = { activityDesignId: "post-design", activityId: "post-activity", mealScheduleId: "post-meal" };
function value(result: IssuanceResult<IssuanceWorkspace>) { if (!result.ok) throw new Error(result.error); return result.value; }
async function fixture() {
  await prisma.user.createMany({ data: [staff, admin].map((actor) => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  await prisma.category.create({ data: { id: "post-category", name: "Post food", normalizedName: "post food" } });
  await prisma.unit.createMany({ data: [{ id: "post-pc", name: "Piece", abbreviation: "pc", normalizedName: "piece", normalizedAbbreviation: "pc" }, { id: "post-tray", name: "Tray", abbreviation: "tray", normalizedName: "tray", normalizedAbbreviation: "tray" }] });
  await prisma.item.createMany({ data: [{ reorderLevel: "10", id: "post-eggs", name: "Eggs", normalizedName: "eggs", categoryId: "post-category", baseUnitId: "post-pc", issuanceQuantityPolicy: "whole-only" }, { reorderLevel: "10", id: "post-water", name: "Water", normalizedName: "water", categoryId: "post-category", baseUnitId: "post-pc", issuanceQuantityPolicy: "allow-decimals" }] });
  await prisma.itemUnitConversion.create({ data: { id: "post-conversion", itemId: "post-eggs", alternateUnitId: "post-tray", baseUnitQuantity: "10" } });
  await prisma.recipe.create({ data: { id: "post-recipe", name: "Egg meal", normalizedName: "egg meal", baselinePax: 2, ingredients: { create: { id: "post-ingredient", itemId: "post-eggs", enteredQuantity: "37" } } } });
  await prisma.activityDesign.create({ data: { id: context.activityDesignId, activityDesignNo: "AD-POST", fiscalYear: 2026, title: "Kitchen event" } });
  await prisma.activity.create({ data: { id: context.activityId, activityDesignId: context.activityDesignId, name: "Training", officeName: "Kitchen", scheduledDate: new Date("2026-10-12"), plannedParticipantCount: 1 } });
  await prisma.mealSchedule.create({ data: { id: context.mealScheduleId, activityId: context.activityId, label: "Lunch", mealTime: "12:00" } });
  await prisma.vendor.create({ data: { id: "post-vendor", name: "Supplier", normalizedName: "supplier" } });
  await prisma.purchaseOrder.create({ data: { id: "post-po", purchaseOrderNo: "PO-POST", normalizedPurchaseOrderNo: "po-post", vendorId: "post-vendor" } });
  await prisma.deliveryReceipt.create({ data: { id: "post-receipt", purchaseOrderId: "post-po", vendorId: "post-vendor", vendorName: "Supplier", purchaseOrderNo: "PO-POST", receiptNo: "DR-POST", normalizedReceiptNo: "dr-post", receiptDate: new Date(), lines: { create: ["post-eggs", "post-water"].map((itemId) => ({ id: `receipt-${itemId}`, itemId, selectedUnitId: "post-pc", baseUnitId: "post-pc", itemName: itemId, selectedUnitName: "Piece", baseUnitName: "Piece", enteredQuantity: "20", conversionFactor: "1", calculatedBaseUnitQuantity: "20", inventoryLedgerMovements: { create: { id: `stock-in-${itemId}`, itemId, baseUnitId: "post-pc", quantity: "20", movementType: "stock-in", occurredAt: new Date() } } })) } } });
}
async function recipeDraft() {
  const source = await previewIssuanceRecipe(staff, "post-recipe"); if (!source.ok) throw Error(source.error);
  return value(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 1, recipes: [{ recipeId: source.value.recipeId, sourceRevision: source.value.sourceRevision, targetMode: "meal", targetPax: 1 }] }));
}
async function confirm(draft: IssuanceWorkspace, quantity = "19") {
  return value(await saveIssuanceDraft(staff, context, { revision: draft.draft.revision, mealPax: 1, recipes: draft.draft.recipes.map((recipe) => ({ snapshotId: recipe.id, targetMode: recipe.targetMode, targetPax: recipe.targetPax })), quantityReviews: [{ itemId: "post-eggs", finalQuantity: quantity }] }));
}
async function stockDraft(quantity = "1.123456789123456789", itemId = "post-water", mealPax: number | null = 1) {
  return value(await saveIssuanceDraft(staff, context, { revision: 0, mealPax, recipes: [], stockItems: [{ itemId, enteredQuantity: quantity, conversionId: null }] }));
}
async function assertDraftUnchanged(draft: IssuanceWorkspace) {
  expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: draft });
  expect(await prisma.inventoryLedgerMovement.count({ where: { movementType: "stock-out" } })).toBe(0);
  expect(await prisma.issuanceRecord.findUnique({ where: { id: draft.draft.id! } })).toMatchObject({ status: "draft", revision: draft.draft.revision, postedAt: null, postingEvidence: null });
}
describe("Atomic issuance posting through public gateways", () => {
  beforeEach(async () => {
    await prisma.issuanceReceiptAllocation.deleteMany();
    await prisma.inventoryLedgerMovement.deleteMany(); await prisma.issuanceItemTotal.deleteMany(); await prisma.issuanceStockItem.deleteMany(); await prisma.issuanceRecipeIngredient.deleteMany(); await prisma.issuanceRecipeSnapshot.deleteMany(); await prisma.issuanceRecord.deleteMany();
    await prisma.recipeIngredient.deleteMany(); await prisma.recipe.deleteMany(); await prisma.itemUnitConversion.deleteMany(); await prisma.deliveryReceiptLine.deleteMany(); await prisma.deliveryReceipt.deleteMany(); await prisma.purchaseOrder.deleteMany(); await prisma.vendor.deleteMany(); await prisma.item.deleteMany(); await prisma.category.deleteMany(); await prisma.unit.deleteMany();
    await prisma.mealSchedule.deleteMany(); await prisma.activity.deleteMany(); await prisma.activityDesign.deleteMany(); await prisma.session.deleteMany(); await prisma.account.deleteMany(); await prisma.user.deleteMany(); await fixture();
  });
  it("blocks exact 18.5, then posts confirmed 19 once and returns immutable retry evidence", async () => {
    const draft = await recipeDraft();
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "policy" }); await assertDraftUnchanged(draft);
    const adjusted = await confirm(draft);
    const posted = value(await postIssuance(staff, context, { revision: adjusted.draft.revision }));
    expect(posted).toMatchObject({ draft: { status: "posted" }, review: [{ calculatedNumerator: "37", calculatedDenominator: "2", finalQuantity: "19", adjusted: true, policy: "whole-only" }], posted: { actorId: staff.id, actorName: staff.name, actorUsername: staff.username } });
    expect(posted.draft.recipes[0].ingredients[0].postedContribution).toEqual({ quantity: "18.5", approximate: false, numerator: "37", denominator: "2" });
    const movement = await prisma.inventoryLedgerMovement.findFirst({ where: { movementType: "stock-out" } });
    expect(movement).toMatchObject({ quantity: "19", itemId: "post-eggs", deliveryReceiptLineId: null, issuanceItemTotalId: expect.any(String) });
    expect(await postIssuance(admin, context, { revision: 1 })).toEqual({ ok: true, value: posted });
    expect(await prisma.inventoryLedgerMovement.count({ where: { movementType: "stock-out" } })).toBe(1);
    expect(await prisma.inventoryLedgerMovement.findFirst({ where: { movementType: "stock-out" } })).toEqual(movement);
    expect(await prisma.inventoryLedgerMovement.count({ where: { movementType: "stock-in" } })).toBe(2);
    await prisma.activityDesign.update({ where: { id: context.activityDesignId }, data: { title: "Changed design" } });
    await prisma.activity.update({ where: { id: context.activityId }, data: { name: "Changed activity", plannedParticipantCount: 999 } });
    await prisma.mealSchedule.update({ where: { id: context.mealScheduleId }, data: { label: "Changed meal", mealTime: "18:00" } });
    await prisma.item.update({ where: { id: "post-eggs" }, data: { name: "Changed eggs", issuanceQuantityPolicy: "allow-decimals", isActive: false } });
    await prisma.unit.update({ where: { id: "post-pc" }, data: { name: "Changed unit", abbreviation: "changed", active: false } });
    await prisma.recipeIngredient.deleteMany(); await prisma.recipe.update({ where: { id: "post-recipe" }, data: { name: "Changed recipe", baselinePax: 999 } });
    await prisma.user.update({ where: { id: staff.id }, data: { name: "Changed user" } });
    expect(await getIssuanceWorkspace(admin, context)).toEqual({ ok: true, value: posted });
    expect(await postIssuance(admin, context, { revision: 1 })).toEqual({ ok: true, value: posted });
    expect(await saveIssuanceDraft(admin, context, { revision: posted.draft.revision, mealPax: 1, recipes: [] })).toMatchObject({ ok: false, kind: "immutable" });
    expect(await deleteMealSchedule(context.activityDesignId, context.activityId, context.mealScheduleId)).toMatchObject({ ok: false, kind: "has-issuance-record" });
    expect(await deleteRecipe(admin, "post-recipe")).toMatchObject({ ok: false });
    expect(await deleteItem(admin, "post-eggs")).toMatchObject({ ok: false });
  });
  it("posts direct-only exact precision and captures current Item/Unit names at posting", async () => {
    const draft = await stockDraft();
    await prisma.item.update({ where: { id: "post-water" }, data: { name: "Posting Water" } });
    await prisma.unit.update({ where: { id: "post-pc" }, data: { name: "Posting Piece", abbreviation: "pp" } });
    const posted = value(await postIssuance(admin, context, { revision: draft.draft.revision }));
    expect(posted.review[0]).toMatchObject({ itemName: "Posting Water", baseUnitName: "Posting Piece", baseUnitAbbreviation: "pp", finalQuantity: "1.123456789123456789" });
    expect(posted.draft.stockItems[0]).toMatchObject({ itemName: "Water", selectedUnitName: "Piece" });
    expect(await prisma.inventoryLedgerMovement.findFirst({ where: { movementType: "stock-out" } })).toMatchObject({ quantity: posted.review[0].finalQuantity });
  });
  it("posts copied Recipe arithmetic after source ingredient replacement, conversion edit and Recipe deactivation", async () => {
    await prisma.recipeIngredient.update({ where: { id: "post-ingredient" }, data: { enteredQuantity: "3.7", itemUnitConversionId: "post-conversion" } });
    const draft = await recipeDraft();
    await prisma.recipeIngredient.deleteMany();
    await prisma.recipe.update({ where: { id: "post-recipe" }, data: { name: "Edited recipe", baselinePax: 999, isActive: false } });
    await prisma.itemUnitConversion.update({ where: { id: "post-conversion" }, data: { baseUnitQuantity: "999" } });
    const saved = await confirm(draft);
    const posted = value(await postIssuance(staff, context, { revision: saved.draft.revision }));
    expect(posted.draft.recipes[0]).toMatchObject({ recipeName: "Egg meal", baselinePax: 2, ingredients: [{ enteredQuantity: "3.7", conversionFactor: "10" }] });
    expect(posted.review[0]).toMatchObject({ calculatedNumerator: "37", calculatedDenominator: "2", finalQuantity: "19" });
  });
  it("allocates across POs by receipt date and preserves exact source evidence after master edits", async () => {
    await prisma.deliveryReceipt.update({ where: { id: "post-receipt" }, data: { receiptDate: new Date("2026-10-01") } });
    await prisma.purchaseOrder.create({ data: { id: "post-po-second", purchaseOrderNo: "PO-SECOND", normalizedPurchaseOrderNo: "po-second", vendorId: "post-vendor" } });
    expect(await postDeliveryReceipt(staff, { purchaseOrderId: "post-po-second", receiptNo: "DR-SECOND", receiptDate: "2026-10-02", lines: [{ itemId: "post-water", quantity: "20", unitPrice: "10" }] })).toMatchObject({ ok: true });
    const draft = await stockDraft("25.123456789123456789");
    const posted = value(await postIssuance(staff, context, { revision: draft.draft.revision }));
    expect(posted.review[0].receiptAllocations).toMatchObject([
      { receiptLineId: "receipt-post-water", quantity: "20", receiptNo: "DR-POST", purchaseOrderNo: "PO-POST", basis: "fifo" },
      { quantity: "5.123456789123456789", receiptNo: "DR-SECOND", purchaseOrderNo: "PO-SECOND", basis: "fifo" },
    ]);
    expect(await prisma.issuanceReceiptAllocation.count()).toBe(2);
    await prisma.purchaseOrder.update({ where: { id: "post-po-second" }, data: { purchaseOrderNo: "RENAMED-PO" } });
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: posted });
    expect(await postIssuance(staff, context, { revision: 1 })).toEqual({ ok: true, value: posted });
    expect(await prisma.issuanceReceiptAllocation.count()).toBe(2);
  });
  it("reconstructs old source links once, labels the assumption and keeps original history unchanged", async () => {
    const first = await stockDraft("5");
    const original = value(await postIssuance(staff, context, { revision: first.draft.revision }));
    delete original.review[0].receiptAllocations;
    const originalEvidence = JSON.stringify(original);
    await prisma.issuanceReceiptAllocation.deleteMany();
    await prisma.issuanceRecord.update({ where: { id: first.draft.id! }, data: { postingEvidence: originalEvidence } });
    const nextContext = { ...context, mealScheduleId: "post-second-meal" };
    await prisma.mealSchedule.create({ data: { id: nextContext.mealScheduleId, activityId: context.activityId, label: "Dinner", mealTime: "18:00" } });
    const next = value(await saveIssuanceDraft(staff, nextContext, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: "post-water", conversionId: null, enteredQuantity: "4" }] }));
    const posted = value(await postIssuance(staff, nextContext, { revision: next.draft.revision }));
    expect(posted.review[0].receiptAllocations).toMatchObject([{ quantity: "4", basis: "fifo" }]);
    expect(await prisma.issuanceReceiptAllocation.findMany({ where: { basis: "reconstructed" } })).toMatchObject([{ quantity: "5", deliveryReceiptLineId: "receipt-post-water" }]);
    expect((await prisma.issuanceRecord.findUniqueOrThrow({ where: { id: first.draft.id! } })).postingEvidence).toBe(originalEvidence);
    const historical = value(await getIssuanceWorkspace(staff, context));
    expect(historical.review[0].receiptAllocations).toMatchObject([{ quantity: "5", basis: "reconstructed" }]);
    expect(historical.review[0].finalQuantity).toBe("5");
    await postIssuance(staff, nextContext, { revision: 1 });
    expect(await prisma.issuanceReceiptAllocation.count()).toBe(2);
  });
  it("reports aggregate shortage without claiming a revision or deducting stock", async () => {
    const draft = await stockDraft("21");
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "shortage", error: expect.stringContaining("requires 21 pc; available 20 pc") }); await assertDraftUnchanged(draft);
  });
  it("rolls back an injected failure after the first movement and permits a clean retry", async () => {
    const draft = value(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: "post-eggs", conversionId: null, enteredQuantity: "2" }, { itemId: "post-water", conversionId: null, enteredQuantity: "3" }] }));
    await expect(postIssuanceRecord(staff, context, 1, prisma, { afterFirstMovement: () => { throw new Error("Injected failure after early stock-out"); } })).rejects.toThrow("Injected failure");
    expect(await prisma.issuanceReceiptAllocation.count()).toBe(0);
    await assertDraftUnchanged(draft);
    expect((await postIssuance(staff, context, { revision: 1 })).ok).toBe(true);
    expect(await prisma.inventoryLedgerMovement.count({ where: { movementType: "stock-out" } })).toBe(2);
  });
  it("blocks missing pax, empty records, tampered commands, stale drafts, and wrong hierarchy", async () => {
    const draft = await stockDraft("2", "post-water", null);
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "validation" }); await assertDraftUnchanged(draft);
    const saved = value(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 1, recipes: [], stockItems: [{ lineId: draft.draft.stockItems[0].id }] }));
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "conflict" }); await assertDraftUnchanged(saved);
    expect(await postIssuance(staff, { ...context, activityId: "wrong" }, { revision: 2 })).toMatchObject({ ok: false, kind: "not-found" }); await assertDraftUnchanged(saved);
    expect(await postIssuance(staff, context, { revision: 2, finalQuantity: "999" })).toMatchObject({ ok: false, kind: "validation" });
    const empty = value(await saveIssuanceDraft(staff, context, { revision: 2, mealPax: 1, recipes: [], stockItems: [] }));
    expect(await postIssuance(staff, context, { revision: 3 })).toMatchObject({ ok: false, kind: "validation" }); await assertDraftUnchanged(empty);
  });
  it.each(["item", "selected unit", "base unit", "base identity"])("rechecks live %s eligibility without modifying draft", async (change) => {
    const draft = value(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 1, recipes: [], stockItems: [{ itemId: "post-eggs", conversionId: "post-conversion", enteredQuantity: "1" }] }));
    if (change === "item") await prisma.item.update({ where: { id: "post-eggs" }, data: { isActive: false } });
    else if (change === "base identity") await prisma.item.update({ where: { id: "post-eggs" }, data: { baseUnitId: "post-tray" } });
    else await prisma.unit.update({ where: { id: change === "selected unit" ? "post-tray" : "post-pc" }, data: { active: false } });
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "reference" });
    expect(await prisma.issuanceRecord.findUnique({ where: { id: draft.draft.id! } })).toMatchObject({ revision: 1, status: "draft" });
    expect(await prisma.inventoryLedgerMovement.count({ where: { movementType: "stock-out" } })).toBe(0);
  });
  it("rechecks policy changes and preserves explicit whole confirmation close to a whole number", async () => {
    await prisma.item.update({ where: { id: "post-eggs" }, data: { issuanceQuantityPolicy: "allow-decimals" } });
    const draft = await recipeDraft();
    await prisma.item.update({ where: { id: "post-eggs" }, data: { issuanceQuantityPolicy: "whole-only" } });
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "policy" });
    await confirm(draft, "19"); expect((await postIssuance(staff, context, { revision: 2 })).ok).toBe(true);
  });
  it("requires reviewed saved quantities when a live policy change alters automatic precision", async () => {
    await prisma.recipeIngredient.update({ where: { id: "post-ingredient" }, data: { enteredQuantity: "36.0000002" } });
    const draft = await recipeDraft(); expect(draft.review[0].finalQuantity).toBe("18.0000001");
    await prisma.item.update({ where: { id: "post-eggs" }, data: { issuanceQuantityPolicy: "allow-decimals" } });
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "policy", error: expect.stringContaining("Review and save") });
    expect(await prisma.issuanceRecord.findFirst()).toMatchObject({ revision: 1, status: "draft" });
    const saved = value(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 1, recipes: draft.draft.recipes.map((recipe) => ({ snapshotId: recipe.id, targetMode: "meal", targetPax: 1 })) }));
    expect(saved.review[0].finalQuantity).toBe("18");
    expect(value(await postIssuance(staff, context, { revision: 2 })).review[0].finalQuantity).toBe("18");
  });
  it("posts an explicit whole adjustment that resolves exact near-whole or repeating fractions", async () => {
    await prisma.recipeIngredient.update({ where: { id: "post-ingredient" }, data: { enteredQuantity: "36.0000002" } });
    const draft = await recipeDraft(); const saved = await confirm(draft, "18"); expect(saved.review[0]).toMatchObject({ adjusted: true, finalQuantity: "18" });
    expect(value(await postIssuance(staff, context, { revision: 2 })).review[0]).toMatchObject({ finalQuantity: "18", adjusted: true });
  });
  it("keeps positive demand rounded to zero visible and posts an exact positive manual confirmation", async () => {
    await prisma.item.update({ where: { id: "post-eggs" }, data: { issuanceQuantityPolicy: "allow-decimals" } });
    await prisma.recipeIngredient.update({ where: { id: "post-ingredient" }, data: { enteredQuantity: "0.0000001" } });
    const draft = await recipeDraft(); expect(draft.review[0]).toMatchObject({ finalQuantity: "0", warning: "rounded-zero" });
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "validation" }); await assertDraftUnchanged(draft);
    const saved = await confirm(draft, "0.00000000001");
    const posted = value(await postIssuance(staff, context, { revision: saved.draft.revision }));
    expect(posted.review[0]).toMatchObject({ finalQuantity: "0.00000000001", adjusted: true });
    expect(await prisma.inventoryLedgerMovement.findFirst({ where: { movementType: "stock-out" } })).toMatchObject({ quantity: "0.00000000001" });
  });
  it("rejects unauthenticated/disabled users and read access", async () => {
    await stockDraft();
    expect(await postIssuance(null, context, { revision: 1 })).toMatchObject({ ok: false, kind: "authentication" });
    expect(await getIssuanceWorkspace(null, context)).toMatchObject({ ok: false, kind: "authentication" });
    await prisma.user.update({ where: { id: staff.id }, data: { disabled: true } });
    expect(await postIssuance(staff, context, { revision: 1 })).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await getIssuanceWorkspace(staff, context)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await postIssuanceRecord(staff, context, 1)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await prisma.issuanceRecord.findFirst()).toMatchObject({ revision: 1, status: "draft" });
  });
});
