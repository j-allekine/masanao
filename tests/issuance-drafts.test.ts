import { beforeEach, describe, expect, it } from "vitest";
import { getIssuanceWorkspace, listIssuanceRecipes, previewIssuanceRecipe, saveIssuanceDraft, listIssuanceStockItems, getIssuanceReviewReferences } from "@/features/issuance/server";
import { deleteRecipe, updateRecipe } from "@/features/recipes/server";
import { deleteItem, updateItem } from "@/features/supply-operations/server";
import { deleteMealSchedule } from "@/features/activity-planning/server";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import type { IssuanceRecipe, IssuanceWorkspace } from "@/features/issuance/types";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { saveIssuanceDraftRecord } from "@/features/issuance/server/db/drafts";
const staff: CurrentActor = { id: "issuance-staff", name: "Kitchen staff", username: "staff" };
const admin: CurrentActor = { id: "issuance-admin", name: "Administrator", username: "admin" };
const context = { activityDesignId: "issuance-design", activityId: "issuance-activity", mealScheduleId: "issuance-meal" };
function retained(recipe: IssuanceRecipe, mealPax: number | null) { return { snapshotId: recipe.id, targetMode: recipe.targetMode, targetPax: recipe.targetMode === "meal" ? mealPax : recipe.targetPax }; }
async function fixture() {
  await prisma.user.createMany({ data: [staff, admin].map((actor) => ({ ...actor, email: `${actor.id}@test.local`, role: actor === admin ? "admin" : "staff" })) });
  await prisma.category.create({ data: { id: "issuance-category", name: "Food", normalizedName: "food" } });
  await prisma.unit.createMany({ data: [{ id: "issuance-kg", name: "Kilogram", abbreviation: "kg", normalizedName: "kilogram", normalizedAbbreviation: "kg" }, { id: "issuance-g", name: "Gram", abbreviation: "g", normalizedName: "gram", normalizedAbbreviation: "g" }] });
  await prisma.item.create({ data: { id: "issuance-rice", name: "Rice", normalizedName: "rice", categoryId: "issuance-category", baseUnitId: "issuance-kg" } });
  await prisma.itemUnitConversion.create({ data: { id: "issuance-conversion", itemId: "issuance-rice", alternateUnitId: "issuance-g", baseUnitQuantity: "0.001" } });
  await prisma.recipe.create({ data: { id: "issuance-recipe", name: "Rice meal", normalizedName: "rice meal", baselinePax: 100, ingredients: { create: { id: "issuance-ingredient", itemId: "issuance-rice", enteredQuantity: "1250.123456789", itemUnitConversionId: "issuance-conversion" } } } });
  await prisma.activityDesign.create({ data: { id: context.activityDesignId, activityDesignNo: "AD-ISS", fiscalYear: 2026, title: "Kitchen event" } });
  await prisma.activity.create({ data: { id: context.activityId, activityDesignId: context.activityDesignId, name: "Training", officeName: "Kitchen", scheduledDate: new Date("2026-10-12"), plannedParticipantCount: 200 } });
  await prisma.mealSchedule.create({ data: { id: context.mealScheduleId, activityId: context.activityId, label: "Lunch", mealTime: "12:00", plannedServings: 999 } });
}
async function firstSave(targetPax = 200, targetMode: "meal" | "explicit" = "meal") {
  const preview = await previewIssuanceRecipe(staff, "issuance-recipe");
  if (!preview.ok) throw new Error(preview.error);
  return saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [{ recipeId: preview.value.recipeId, sourceRevision: preview.value.sourceRevision, targetMode, targetPax }] });
}
function workspace(result: Awaited<ReturnType<typeof saveIssuanceDraft>>): IssuanceWorkspace {
  if (!result.ok) throw new Error(result.error); return result.value;
}
describe("Issuance Recipe drafts through public gateways", () => {
  beforeEach(async () => {
    await prisma.issuanceItemTotal.deleteMany(); await prisma.issuanceStockItem.deleteMany(); await prisma.issuanceRecipeIngredient.deleteMany(); await prisma.issuanceRecipeSnapshot.deleteMany(); await prisma.issuanceRecord.deleteMany();
    await prisma.recipeIngredient.deleteMany(); await prisma.recipe.deleteMany(); await prisma.itemUnitConversion.deleteMany(); await prisma.inventoryLedgerMovement.deleteMany(); await prisma.deliveryReceiptLine.deleteMany(); await prisma.deliveryReceipt.deleteMany(); await prisma.purchaseOrder.deleteMany(); await prisma.vendor.deleteMany(); await prisma.item.deleteMany(); await prisma.category.deleteMany(); await prisma.unit.deleteMany();
    await prisma.mealSchedule.deleteMany(); await prisma.activity.deleteMany(); await prisma.activityDesign.deleteMany(); await prisma.session.deleteMany(); await prisma.account.deleteMany(); await prisma.user.deleteMany(); await fixture();
  });
  it("saves direct Stock-only drafts with pending pax and exact arbitrary input precision", async () => {
    const enteredQuantity = "0002.123456789123456789000";
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: null, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: null, enteredQuantity }] }));
    expect(saved.draft).toMatchObject({ revision: 1, mealPax: null, recipes: [], stockItems: [{ itemId: "issuance-rice", enteredQuantity, conversionId: null, conversionFactor: "1", selectedUnitId: "issuance-kg", baseUnitId: "issuance-kg" }] });
    expect(await getIssuanceWorkspace(admin, context)).toEqual({ ok: true, value: saved });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("distinguishes alternate conversions sharing a Unit and snapshots the canonical factor", async () => {
    await prisma.itemUnitConversion.create({ data: { id: "issuance-second-conversion", itemId: "issuance-rice", alternateUnitId: "issuance-g", baseUnitQuantity: "0.002" } });
    const options = await listIssuanceStockItems(staff);
    expect(options).toMatchObject({ ok: true, value: [{ id: "issuance-rice", conversions: [{ id: "issuance-conversion", factor: "0.001" }, { id: "issuance-second-conversion", factor: "0.002" }] }] });
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: "issuance-second-conversion", enteredQuantity: "0.123456789123" }] }));
    expect(saved.draft.stockItems[0]).toMatchObject({ conversionId: "issuance-second-conversion", conversionFactor: "0.002", selectedUnitId: "issuance-g", baseUnitId: "issuance-kg", enteredQuantity: "0.123456789123" });
  });
  it("preserves untouched Stock evidence after master edits, conversion removal, and deactivation", async () => {
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: "issuance-conversion", enteredQuantity: "2.500000001" }] }));
    await prisma.recipeIngredient.deleteMany();
    await prisma.itemUnitConversion.delete({ where: { id: "issuance-conversion" } });
    await prisma.item.update({ where: { id: "issuance-rice" }, data: { name: "Renamed Rice", isActive: false } });
    await prisma.unit.update({ where: { id: "issuance-g" }, data: { name: "Renamed Gram", active: false } });
    const resaved = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems: [{ lineId: saved.draft.stockItems[0].id }] }));
    expect(resaved.draft.stockItems).toEqual(saved.draft.stockItems);
    expect(await listIssuanceStockItems(staff)).toEqual({ ok: true, value: [] });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("deliberate Stock quantity edits apply the current factor and active references", async () => {
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: "issuance-conversion", enteredQuantity: "2" }] }));
    const selection = { lineId: saved.draft.stockItems[0].id, itemId: "issuance-rice", conversionId: "issuance-conversion", enteredQuantity: "3.123456789" };
    await prisma.itemUnitConversion.update({ where: { id: "issuance-conversion" }, data: { baseUnitQuantity: "0.009" } });
    const edited = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems: [selection] }));
    expect(edited.draft.stockItems[0]).toMatchObject({ id: selection.lineId, enteredQuantity: selection.enteredQuantity, conversionFactor: "0.009" });
    await prisma.unit.update({ where: { id: "issuance-g" }, data: { active: false } });
    expect(await saveIssuanceDraft(staff, context, { revision: 2, mealPax: 200, recipes: [], stockItems: [{ ...selection, enteredQuantity: "4" }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: edited });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("rejects invalid Stock quantities, foreign conversions, and copied-data tampering", async () => {
    for (const enteredQuantity of ["0", "-1", "1e3", ".5", "1.", "NaN", ""]) expect(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: null, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: null, enteredQuantity }] })).toMatchObject({ ok: false, kind: "validation" });
    for (const extra of [{ conversionId: "foreign-conversion" }, { conversionFactor: "100" }, { selectedUnitId: "issuance-g" }, { baseUnitId: "issuance-g" }]) expect(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: null, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: null, enteredQuantity: "2", ...extra }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await prisma.issuanceRecord.count()).toBe(0);
  });
  it("rejects foreign or duplicate retained Stock identities and protects Item references", async () => {
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: null, enteredQuantity: "2" }] }));
    const retained = { lineId: saved.draft.stockItems[0].id };
    for (const stockItems of [[{ lineId: "foreign-line" }], [retained, retained], [{ ...retained, conversionFactor: "2" }]]) expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems })).toMatchObject({ ok: false, kind: "validation" });
    await prisma.recipeIngredient.deleteMany(); await prisma.itemUnitConversion.deleteMany();
    expect(await deleteItem(admin, "issuance-rice")).toMatchObject({ ok: false });
    expect(await updateItem(admin, "issuance-rice", { name: "Rice", categoryId: "issuance-category", baseUnitId: "issuance-g", note: "", issuanceQuantityPolicy: "allow-decimals" })).toMatchObject({ ok: false, fields: { baseUnitId: ["Base Unit cannot change while saved issuance references this Item."] } });
    const empty = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: null, recipes: [], stockItems: [] }));
    expect(empty.draft).toMatchObject({ id: saved.draft.id, revision: 2, stockItems: [] });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("rejects unauthenticated and disabled Stock option reads", async () => {
    expect(await listIssuanceStockItems(null)).toMatchObject({ ok: false, kind: "authentication" });
    expect((await listIssuanceStockItems(admin)).ok).toBe(true);
    await prisma.user.update({ where: { id: staff.id }, data: { disabled: true } });
    expect(await listIssuanceStockItems(staff)).toMatchObject({ ok: false, kind: "forbidden" });
  });
  it("opens in the exact hierarchy with positive Activity pax, without creating a record", async () => {
    const result = await getIssuanceWorkspace(staff, context);
    expect(result).toMatchObject({ ok: true, value: { context: { activityName: "Training", mealLabel: "Lunch" }, draft: { id: null, revision: 0, mealPax: 200, recipes: [] } } });
    expect(await prisma.issuanceRecord.count()).toBe(0);
    expect(await getIssuanceWorkspace(staff, { ...context, activityId: "wrong" })).toMatchObject({ ok: false, kind: "not-found" });
  });
  it("never defaults from legacy Meal Schedule servings when Activity pax is missing or zero", async () => {
    for (const plannedParticipantCount of [null, 0]) {
      await prisma.activity.update({ where: { id: context.activityId }, data: { plannedParticipantCount } });
      expect(await getIssuanceWorkspace(staff, context)).toMatchObject({ ok: true, value: { draft: { mealPax: null } } });
    }
  });
  it("copies exact canonical ingredient data and reopens without inventory effects", async () => {
    const saved = workspace(await firstSave());
    expect(saved.draft).toMatchObject({ revision: 1, mealPax: 200, recipes: [{ recipeId: "issuance-recipe", baselinePax: 100, targetMode: "meal", targetPax: 200, ingredients: [{ itemId: "issuance-rice", enteredQuantity: "1250.123456789", conversionFactor: "0.001", selectedUnitId: "issuance-g", baseUnitId: "issuance-kg" }] }] });
    expect(await getIssuanceWorkspace(admin, context)).toEqual({ ok: true, value: saved });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("preserves saved defaults and snapshots after planning, Recipe ingredient replacement, and conversion edits", async () => {
    const saved = workspace(await firstSave());
    await prisma.activity.update({ where: { id: context.activityId }, data: { plannedParticipantCount: 500 } });
    const edit = await updateRecipe(admin, "issuance-recipe", { name: "Changed Rice", baselinePax: 10, preparationNote: "", ingredients: [{ itemId: "issuance-rice", quantity: "99", itemUnitConversionId: "issuance-conversion" }] });
    expect(edit.ok).toBe(true);
    await prisma.itemUnitConversion.update({ where: { id: "issuance-conversion" }, data: { baseUnitQuantity: "0.002" } });
    await prisma.recipe.update({ where: { id: "issuance-recipe" }, data: { isActive: false } });
    const result = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: saved.draft.recipes.map((recipe) => retained(recipe, 200)) }));
    expect(result.draft.recipes).toEqual(saved.draft.recipes); expect(result.draft.mealPax).toBe(200);
  });
  it("rejects changed first-save sources and rolls back the revision claim on failed additions", async () => {
    const preview = await previewIssuanceRecipe(staff, "issuance-recipe"); if (!preview.ok) throw Error();
    await prisma.unit.update({ where: { id: "issuance-g" }, data: { name: "Updated Gram" } });
    expect(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [{ recipeId: "issuance-recipe", sourceRevision: preview.value.sourceRevision, targetMode: "meal", targetPax: 200 }] })).toMatchObject({ ok: false, kind: "source-changed" });
    expect(await prisma.issuanceRecord.count()).toBe(0);
    const saved = workspace(await firstSave());
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [{ snapshotId: "foreign-snapshot", targetMode: "meal", targetPax: 200 }] })).toMatchObject({ ok: false, kind: "validation" });
    expect((await prisma.issuanceRecord.findUnique({ where: { id: saved.draft.id! } }))?.revision).toBe(1);
  });
  it("rejects arbitrary snapshot replacement payloads and duplicate Recipes", async () => {
    const saved = workspace(await firstSave());
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [{ ...retained(saved.draft.recipes[0], 200), ingredients: [] }] })).toMatchObject({ ok: false, kind: "validation" });
    const preview = await previewIssuanceRecipe(staff, "issuance-recipe"); if (!preview.ok) throw Error();
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [retained(saved.draft.recipes[0], 200), { recipeId: "issuance-recipe", sourceRevision: preview.value.sourceRevision, targetMode: "meal", targetPax: 200 }] })).toMatchObject({ ok: false, kind: "validation" });
    expect((await prisma.issuanceRecord.findUnique({ where: { id: saved.draft.id! } }))?.revision).toBe(1);
  });
  it("requires reselection after a conversion edit and refuses to refresh a persisted snapshot by new identity", async () => {
    const preview = await previewIssuanceRecipe(staff, "issuance-recipe"); if (!preview.ok) throw Error();
    await prisma.itemUnitConversion.update({ where: { id: "issuance-conversion" }, data: { baseUnitQuantity: "0.002" } });
    const selection = { recipeId: "issuance-recipe", sourceRevision: preview.value.sourceRevision, targetMode: "meal", targetPax: 200 };
    expect(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [selection] })).toMatchObject({ ok: false, kind: "source-changed" });
    const saved = workspace(await firstSave());
    expect(saved.draft.recipes[0].ingredients[0].conversionFactor).toBe("0.002");
    const fresh = await previewIssuanceRecipe(staff, "issuance-recipe"); if (!fresh.ok) throw Error();
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [{ ...selection, sourceRevision: fresh.value.sourceRevision }] })).toMatchObject({ ok: false, kind: "validation" });
    expect((await prisma.issuanceRecord.findUnique({ where: { id: saved.draft.id! } }))?.revision).toBe(1);
  });
  it("keeps explicit targets when Meal pax is cleared and changes inherited targets only", async () => {
    const saved = workspace(await firstSave(75, "explicit"));
    const pending = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: null, recipes: saved.draft.recipes.map((recipe) => retained(recipe, null)) }));
    expect(pending.draft.mealPax).toBeNull(); expect(pending.draft.recipes[0].targetPax).toBe(75);
    const inherited = workspace(await saveIssuanceDraft(staff, context, { revision: 2, mealPax: 50, recipes: [{ snapshotId: pending.draft.recipes[0].id, targetMode: "meal", targetPax: 50 }] }));
    const cleared = workspace(await saveIssuanceDraft(staff, context, { revision: 3, mealPax: null, recipes: inherited.draft.recipes.map((recipe) => retained(recipe, null)) }));
    expect(cleared.draft.recipes[0].targetPax).toBeNull();
  });
  it("rejects new Recipe additions without Meal pax and invalid pax bounds", async () => {
    const preview = await previewIssuanceRecipe(staff, "issuance-recipe"); if (!preview.ok) throw Error();
    for (const mealPax of [null, 0, -1, 1.5, 2147483648]) expect((await saveIssuanceDraft(staff, context, { revision: 0, mealPax, recipes: [{ recipeId: "issuance-recipe", sourceRevision: preview.value.sourceRevision, targetMode: "explicit", targetPax: 75 }] })).ok).toBe(false);
  });
  it("excludes inactive Recipes and marks missing-baseline selection unavailable", async () => {
    await prisma.recipe.create({ data: { id: "legacy-recipe", name: "Legacy", normalizedName: "legacy" } });
    expect(await listIssuanceRecipes(staff)).toMatchObject({ ok: true, value: [{ id: "legacy-recipe", available: false, reason: "Baseline pax required" }, { id: "issuance-recipe", available: true }] });
    expect(await previewIssuanceRecipe(staff, "legacy-recipe")).toMatchObject({ ok: false, kind: "validation" });
    await prisma.recipe.update({ where: { id: "issuance-recipe" }, data: { isActive: false } });
    expect(await previewIssuanceRecipe(staff, "issuance-recipe")).toMatchObject({ ok: false, kind: "validation" });
  });
  it("rejects stale saves and preserves one record during concurrent first saves", async () => {
    const results = await Promise.all([firstSave(), firstSave()]);
    expect(results.filter((result) => result.ok)).toHaveLength(1); expect(await prisma.issuanceRecord.count()).toBe(1);
    expect(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 300, recipes: [] })).toMatchObject({ ok: false, kind: "conflict" });
  });
  it("serializes independent connections attempting the same first save", async () => {
    const preview = await previewIssuanceRecipe(staff, "issuance-recipe"); if (!preview.ok) throw Error();
    const input = { revision: 0, mealPax: 200, recipes: [{ recipeId: "issuance-recipe", sourceRevision: preview.value.sourceRevision, targetMode: "meal" as const, targetPax: 200 }] };
    const first = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
    const second = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) });
    try {
      const results = await Promise.all([saveIssuanceDraftRecord(context, input, first), saveIssuanceDraftRecord(context, input, second)]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok)).toHaveLength(1);
      expect(await prisma.issuanceRecord.count()).toBe(1);
      expect(await prisma.issuanceRecipeSnapshot.count()).toBe(1);
    } finally { await first.$disconnect(); await second.$disconnect(); }
  }, 20000);
  it("keeps an empty saved record after removing the last Recipe", async () => {
    const saved = workspace(await firstSave());
    const empty = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: null, recipes: [] }));
    expect(empty.draft.id).toBe(saved.draft.id); expect(empty.draft.recipes).toEqual([]); expect(empty.draft.mealPax).toBeNull();
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("enforces reference restrictions after the master ingredient list changes", async () => {
    await firstSave(); await prisma.recipeIngredient.deleteMany(); await prisma.itemUnitConversion.deleteMany();
    expect(await deleteRecipe(admin, "issuance-recipe")).toMatchObject({ ok: false, kind: "referenced" });
    expect(await deleteItem(admin, "issuance-rice")).toMatchObject({ ok: false });
    expect(await updateItem(admin, "issuance-rice", { name: "Rice", categoryId: "issuance-category", baseUnitId: "issuance-g", note: "", issuanceQuantityPolicy: "allow-decimals" })).toMatchObject({ ok: false, fields: { baseUnitId: ["Base Unit cannot change while saved issuance references this Item."] } });
    expect(await deleteMealSchedule(context.activityDesignId, context.activityId, context.mealScheduleId)).toMatchObject({ ok: false, kind: "has-issuance-record" });
  });
  it("rejects unauthenticated, missing, disabled, and unsupported-role actors for every public read/write", async () => {
    await prisma.user.create({ data: { id: "issuance-observer", name: "Observer", email: "observer@test.local", role: "observer" } });
    for (const actor of [null, { ...staff, id: "missing" }, { ...staff, id: "issuance-observer" }]) {
      expect((await getIssuanceWorkspace(actor, context)).ok).toBe(false); expect((await listIssuanceRecipes(actor)).ok).toBe(false); expect((await previewIssuanceRecipe(actor, "issuance-recipe")).ok).toBe(false); expect((await saveIssuanceDraft(actor, context, {})).ok).toBe(false);
    }
    await prisma.user.update({ where: { id: staff.id }, data: { disabled: true } }); expect((await getIssuanceWorkspace(staff, context)).ok).toBe(false);
  });
  it("reserves posted state as immutable through the supported draft save", async () => {
    const saved = workspace(await firstSave()); await prisma.issuanceRecord.update({ where: { id: saved.draft.id! }, data: { status: "posted", postingEvidence: JSON.stringify({ ...saved, draft: { ...saved.draft, status: "posted" } }) } });
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [] })).toMatchObject({ ok: false, kind: "immutable" });
    expect((await prisma.issuanceRecord.findUnique({ where: { id: saved.draft.id! } }))?.revision).toBe(1);
  });
  it("persists exact calculated provenance, confirmed precision, reset and equality", async () => {
    const stockItems = [{ itemId: "issuance-rice", conversionId: null, enteredQuantity: "2.123456789123456789" }];
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems, quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "3.987654321987654321" }] }));
    expect(saved.review[0]).toMatchObject({ automaticQuantity: "2.123456789123456789", finalQuantity: "3.987654321987654321", adjusted: true, shortage: true });
    expect(saved.draft.itemTotals?.[0]).toMatchObject({ calculatedNumerator: "2123456789123456789", calculatedDenominator: "1000000000000000000", finalQuantity: "3.987654321987654321", adjusted: true });
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: saved });
    const retainedStock = [{ lineId: saved.draft.stockItems[0].id }];
    const unchanged = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems: retainedStock }));
    expect(unchanged.review[0].finalQuantity).toBe("3.987654321987654321");
    const equal = workspace(await saveIssuanceDraft(staff, context, { revision: 2, mealPax: 200, recipes: [], stockItems: retainedStock, quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "0002.123456789123456789000" }] }));
    expect(equal.review[0]).toMatchObject({ finalQuantity: "2.123456789123456789", adjusted: false });
    const adjusted = workspace(await saveIssuanceDraft(staff, context, { revision: 3, mealPax: 200, recipes: [], stockItems: retainedStock, quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "4" }] }));
    const reset = workspace(await saveIssuanceDraft(staff, context, { revision: adjusted.draft.revision, mealPax: 200, recipes: [], stockItems: retainedStock, resetItemIds: ["issuance-rice"] }));
    expect(reset.review[0]).toMatchObject({ finalQuantity: "2.123456789123456789", adjusted: false });
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("rejects affected Recipe changes and form bypass until explicit reset, allowing unrelated demand", async () => {
    const saved = workspace(await firstSave());
    const adjusted = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: saved.draft.recipes.map((recipe) => retained(recipe, 200)), quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "3" }] }));
    const changed = { revision: 2, mealPax: 100, recipes: adjusted.draft.recipes.map((recipe) => retained(recipe, 100)) };
    expect(await saveIssuanceDraft(staff, context, changed)).toMatchObject({ ok: false, kind: "validation", error: expect.stringContaining("Reset the confirmed quantity") });
    expect(await saveIssuanceDraft(staff, context, { ...changed, quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "1.250123" }] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await saveIssuanceDraft(staff, context, { revision: 2, mealPax: null, recipes: [] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: adjusted });
    await prisma.item.create({ data: { id: "issuance-water", name: "Water", normalizedName: "water", categoryId: "issuance-category", baseUnitId: "issuance-kg" } });
    const unrelated = workspace(await saveIssuanceDraft(staff, context, { revision: 2, mealPax: 200, recipes: adjusted.draft.recipes.map((recipe) => retained(recipe, 200)), stockItems: [{ itemId: "issuance-water", conversionId: null, enteredQuantity: "1" }] }));
    expect(unrelated.review.find((item) => item.itemId === "issuance-rice")).toMatchObject({ finalQuantity: "3", adjusted: true });
    const reset = workspace(await saveIssuanceDraft(staff, context, { ...changed, revision: 3, stockItems: unrelated.draft.stockItems.map((line) => ({ lineId: line.id })), resetItemIds: ["issuance-rice"] }));
    expect(reset.review.find((item) => item.itemId === "issuance-rice")).toMatchObject({ finalQuantity: "1.250123", adjusted: false });
  });
  it("locks direct edit/removal/addition of the adjusted Item without silently rebasing confirmation", async () => {
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: "issuance-conversion", enteredQuantity: "1000" }], quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "2" }] }));
    const line = saved.draft.stockItems[0];
    for (const stockItems of [[], [{ lineId: line.id, itemId: line.itemId, conversionId: line.conversionId, enteredQuantity: "2000" }], [{ lineId: line.id }, { itemId: line.itemId, conversionId: null, enteredQuantity: "1" }]]) {
      expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems })).toMatchObject({ ok: false, kind: "validation", error: expect.stringContaining("Reset") });
    }
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: saved });
    const reset = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems: [], resetItemIds: [line.itemId] }));
    expect(reset.review).toEqual([]); expect(reset.draft.itemTotals).toEqual([]);
  });
  it("revalidates current whole policy, preserves an invalid existing confirmation and pending draft", async () => {
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: null, enteredQuantity: "18.5" }], quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "19.5" }] }));
    await prisma.item.update({ where: { id: "issuance-rice" }, data: { issuanceQuantityPolicy: "whole-only" } });
    const current = await getIssuanceWorkspace(staff, context);
    expect(current).toMatchObject({ ok: true, value: { review: [{ finalQuantity: "19.5", warning: "fractional", policy: "whole-only" }] } });
    const stockItems = [{ lineId: saved.draft.stockItems[0].id }];
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems, quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "19.5" }] })).toMatchObject({ ok: false, kind: "validation" });
    const confirmed = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems, quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "19" }] }));
    expect(confirmed.review[0]).toMatchObject({ finalQuantity: "19", adjusted: true, warning: null });
    const pending = workspace(await saveIssuanceDraft(staff, context, { revision: 2, mealPax: null, recipes: [], stockItems }));
    expect(pending.reviewPending).toBe(true); expect(pending.review[0].shortage).toBe(false);
  });
  it("rejects invalid, duplicate, foreign quantity edits and forged reset IDs", async () => {
    const saved = workspace(await firstSave()); const recipes = saved.draft.recipes.map((recipe) => retained(recipe, 200));
    for (const finalQuantity of ["0", "-1", "1e3", "", ".5"]) expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes, quantityReviews: [{ itemId: "issuance-rice", finalQuantity }] })).toMatchObject({ ok: false, kind: "validation" });
    for (const quantityReviews of [[{ itemId: "foreign", finalQuantity: "1" }], [{ itemId: "issuance-rice", finalQuantity: "1" }, { itemId: "issuance-rice", finalQuantity: "2" }]]) expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes, quantityReviews })).toMatchObject({ ok: false, kind: "validation" });
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes, resetItemIds: ["issuance-rice"] })).toMatchObject({ ok: false, kind: "validation" });
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: saved });
  });
  it("uses precise posted stock-in for advisory availability and restricts reference reads to requested Items", async () => {
    await prisma.vendor.create({ data: { id: "issuance-vendor", name: "Vendor", normalizedName: "issuance-vendor" } });
    await prisma.purchaseOrder.create({ data: { id: "issuance-po", purchaseOrderNo: "ISS-PO", normalizedPurchaseOrderNo: "iss-po", vendorId: "issuance-vendor" } });
    const quantity = "19.000000000000000001";
    await prisma.deliveryReceipt.create({ data: { id: "issuance-receipt", purchaseOrderId: "issuance-po", vendorId: "issuance-vendor", vendorName: "Vendor", purchaseOrderNo: "ISS-PO", receiptNo: "ISS-DR", normalizedReceiptNo: "iss-dr", receiptDate: new Date(), lines: { create: { id: "issuance-receipt-line", itemId: "issuance-rice", selectedUnitId: "issuance-kg", baseUnitId: "issuance-kg", itemName: "Rice", selectedUnitName: "Kilogram", baseUnitName: "Kilogram", enteredQuantity: quantity, conversionFactor: "1", calculatedBaseUnitQuantity: quantity, inventoryLedgerMovements: { create: { id: "issuance-inbound", itemId: "issuance-rice", baseUnitId: "issuance-kg", quantity, movementType: "stock-in", occurredAt: new Date() } } } } } });
    expect(await getIssuanceReviewReferences(null, ["issuance-rice"])).toMatchObject({ ok: false, kind: "authentication" });
    expect(await getIssuanceReviewReferences(staff, "issuance-rice")).toMatchObject({ ok: false, kind: "validation" });
    expect(await getIssuanceReviewReferences(staff, [])).toEqual({ ok: true, value: [] });
    expect(await getIssuanceReviewReferences(staff, ["issuance-rice", "issuance-rice"])).toEqual({ ok: true, value: [{ itemId: "issuance-rice", policy: "allow-decimals", availableQuantity: quantity }] });
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [{ itemId: "issuance-rice", conversionId: null, enteredQuantity: quantity }] }));
    expect(saved.review[0]).toMatchObject({ finalQuantity: quantity, availableQuantity: quantity, shortage: false });
    const excess = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems: saved.draft.stockItems.map((line) => ({ lineId: line.id })), quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "19.000000000000000002" }] }));
    expect(excess.review[0].shortage).toBe(true);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(1);
  });
  it("does not treat equal aggregate totals as permission to change locked contributions", async () => {
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 200, recipes: [], stockItems: [1, 2].map(() => ({ itemId: "issuance-rice", conversionId: null, enteredQuantity: "1" })), quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "3" }] }));
    const stockItems = saved.draft.stockItems.map((line, index) => ({ lineId: line.id, itemId: line.itemId, conversionId: null, enteredQuantity: index ? "1.5" : "0.5" }));
    expect(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems })).toMatchObject({ ok: false, kind: "validation", error: expect.stringContaining("Reset") });
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: saved });
    const reset = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 200, recipes: [], stockItems, resetItemIds: ["issuance-rice"] }));
    expect(reset.review[0]).toMatchObject({ finalQuantity: "2", adjusted: false });
  });
  it("retains confirmation of a rounded whole value when exact Recipe demand is fractional", async () => {
    await prisma.item.update({ where: { id: "issuance-rice" }, data: { issuanceQuantityPolicy: "whole-only" } });
    await prisma.recipe.update({ where: { id: "issuance-recipe" }, data: { baselinePax: 2 } });
    await prisma.recipeIngredient.update({ where: { id: "issuance-ingredient" }, data: { enteredQuantity: "36.0000002", itemUnitConversionId: null } });
    const source = await previewIssuanceRecipe(staff, "issuance-recipe"); if (!source.ok) throw new Error(source.error);
    const saved = workspace(await saveIssuanceDraft(staff, context, { revision: 0, mealPax: 1, recipes: [{ recipeId: source.value.recipeId, sourceRevision: source.value.sourceRevision, targetMode: "meal", targetPax: 1 }] }));
    expect(saved.review[0]).toMatchObject({ automaticQuantity: "18.0000001", finalQuantity: "18.0000001", warning: "fractional", adjusted: false });
    const confirmed = workspace(await saveIssuanceDraft(staff, context, { revision: 1, mealPax: 1, recipes: saved.draft.recipes.map((recipe) => retained(recipe, 1)), quantityReviews: [{ itemId: "issuance-rice", finalQuantity: "18" }] }));
    expect(confirmed.review[0]).toMatchObject({ calculatedNumerator: "180000001", calculatedDenominator: "10000000", finalQuantity: "18", adjusted: true, warning: null });
    expect(await getIssuanceWorkspace(staff, context)).toEqual({ ok: true, value: confirmed });
  });
});
