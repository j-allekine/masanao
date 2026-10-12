import "server-only";
import { Prisma } from "@/prisma/generated/client";
import type { PrismaClient } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import { getRecipeIssuanceSourceRecord, listRecipeIssuanceOptionRecords } from "@/features/recipes/server/db/issuance-source";
import type { SaveDraftInput } from "../../schemas/draft";
import type { IssuanceContext, IssuanceDraft, IssuanceResult, IssuanceWorkspace, IssuanceRecipeOption, IssuanceIngredient } from "../../types";
import { getIssuanceStockSelectionRecord } from "./stock-items";
import { getIssuanceReviewReferences } from "./quantities";
import { calculateIssuanceReview, confirmationIsAdjustment, issuanceDemandSignatures } from "../../domain/quantities";
import { decimalRational, finiteDecimal, isWholeRational } from "../../domain/rational";

type IssuanceDatabase = Pick<Prisma.TransactionClient, "mealSchedule" | "issuanceRecord" | "issuanceRecipeSnapshot" | "issuanceRecipeIngredient" | "recipe" | "user" | "item" | "inventoryLedgerMovement">;
const recordInclude = { recipes: { include: { ingredients: true }, orderBy: { id: "asc" as const } }, stockItems: { orderBy: { id: "asc" as const } }, itemTotals: true };
function ingredientCopy(ingredient: IssuanceIngredient) {
  return {
    itemId: ingredient.itemId, itemName: ingredient.itemName,
    enteredQuantity: ingredient.enteredQuantity, conversionFactor: ingredient.conversionFactor,
    selectedUnitId: ingredient.selectedUnitId, selectedUnitName: ingredient.selectedUnitName,
    selectedUnitAbbreviation: ingredient.selectedUnitAbbreviation,
    baseUnitId: ingredient.baseUnitId, baseUnitName: ingredient.baseUnitName,
    baseUnitAbbreviation: ingredient.baseUnitAbbreviation,
  };
}
export async function actorCanUseIssuance(actor: CurrentActor | null | undefined) {
  if (!actor) return false;
  return Boolean(await prisma.user.findFirst({ where: { id: actor.id, disabled: false, role: { in: ["staff", "admin"] } }, select: { id: true } }));
}
export async function getIssuanceWorkspaceRecord(context: IssuanceContext, database: IssuanceDatabase = prisma): Promise<IssuanceWorkspace | null> {
  const meal = await database.mealSchedule.findFirst({ where: { id: context.mealScheduleId, activityId: context.activityId, activity: { activityDesignId: context.activityDesignId } }, include: { activity: { include: { activityDesign: true } } } });
  if (!meal) return null;
  const record = await database.issuanceRecord.findUnique({ where: { mealScheduleId: meal.id }, include: recordInclude });
  // Posted evidence is complete and immutable; never consult current balances or masters.
  if (record?.status === "posted") {
    if (!record.postingEvidence) throw new Error("Posted issuance is missing historical evidence.");
    return JSON.parse(record.postingEvidence) as IssuanceWorkspace;
  }
  const draft: IssuanceDraft = record ? {
    id: record.id,
    revision: record.revision,
    status: record.status === "posted" ? "posted" : "draft",
    mealPax: record.mealPax,
    itemTotals: record.itemTotals.map(({ itemId, calculatedNumerator, calculatedDenominator, finalQuantity, adjusted }) => ({ itemId, calculatedNumerator, calculatedDenominator, finalQuantity, adjusted })),
    stockItems: record.stockItems.map((stock) => ({ id: stock.id, conversionId: stock.conversionId, ...ingredientCopy(stock) })),
    recipes: record.recipes.map((recipe) => ({
      id: recipe.id,
      recipeId: recipe.recipeId,
      recipeName: recipe.recipeName,
      baselinePax: recipe.baselinePax,
      sourceRevision: recipe.sourceRevision,
      targetMode: recipe.targetMode === "explicit" ? "explicit" : "meal",
      targetPax: recipe.targetPax,
      ingredients: recipe.ingredients.map((ingredient) => ({ id: ingredient.id, ...ingredientCopy(ingredient) })),
    })),
  } : {
    id: null,
    revision: 0,
    status: "draft",
    mealPax: meal.activity.plannedParticipantCount && meal.activity.plannedParticipantCount > 0 ? meal.activity.plannedParticipantCount : null,
    recipes: [],
    stockItems: [],
    itemTotals: [],
  };
  const reviewReferences = await getIssuanceReviewReferences([...draft.stockItems.map((stock) => stock.itemId), ...draft.recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ingredient.itemId))], database);
  return { context: { ...context, activityDesignNo: meal.activity.activityDesign.activityDesignNo, activityDesignTitle: meal.activity.activityDesign.title, activityName: meal.activity.name, mealLabel: meal.label, mealTime: meal.mealTime, plannedPax: meal.activity.plannedParticipantCount }, draft, reviewReferences, ...calculateIssuanceReview(draft, reviewReferences) };
}
export async function listIssuanceRecipeOptionRecords(): Promise<IssuanceRecipeOption[]> {
  return listRecipeIssuanceOptionRecords();
}
class DraftRejected extends Error { constructor(readonly result: IssuanceResult<IssuanceWorkspace>) { super("Draft rejected"); } }
function failure(kind: "conflict" | "source-changed" | "validation" | "immutable" | "not-found" | "busy", error: string): IssuanceResult<IssuanceWorkspace> { throw new DraftRejected({ ok: false, kind, error }); }

export async function saveIssuanceDraftRecord(context: IssuanceContext, input: SaveDraftInput, database: Pick<PrismaClient, "$transaction"> = prisma): Promise<IssuanceResult<IssuanceWorkspace>> {
  try {
    return await database.$transaction(async (transaction) => {
      // Acquire the write lock before reading the draft, avoiding read-then-write races in SQLite.
      const guarded = await transaction.issuanceRecord.updateMany({ where: { mealScheduleId: context.mealScheduleId, revision: input.revision, status: "draft" }, data: { revision: { increment: 1 } } });
      const workspace = await getIssuanceWorkspaceRecord(context, transaction);
      if (!workspace) return failure("not-found", "Meal Schedule not found.");
      const existing = workspace.draft;
      if (existing.status === "posted") return failure("immutable", "Posted issuance cannot be edited.");
      if (existing.id && guarded.count !== 1) return failure("conflict", "This draft changed. Reopen issuance before saving your changes.");
      if (!existing.id && input.revision !== 0) return failure("conflict", "This draft changed. Reopen issuance before saving your changes.");
      const snapshotById = new Map(existing.recipes.map((recipe) => [recipe.id, recipe]));
      const recipeIds = new Set<string>();
      const additions = [];
      const stockById = new Map(existing.stockItems.map((stock) => [stock.id, stock]));
      const stockSelections = [];
      const retainedStockIds = new Set<string>();
      for (const entry of input.stockItems ?? []) {
        if (entry.lineId) {
          if (!stockById.has(entry.lineId) || retainedStockIds.has(entry.lineId)) return failure("validation", "A selected Stock item line does not belong to this issuance or was included twice.");
          retainedStockIds.add(entry.lineId);
        }
        if ("itemId" in entry) {
          const source = await getIssuanceStockSelectionRecord(entry.itemId, entry.conversionId, transaction);
          if (!source) return failure("validation", "Select an active Stock item and its active Base Unit or configured alternate Unit. Remove unavailable selections or select a current Unit.");
          stockSelections.push({ lineId: entry.lineId, source, enteredQuantity: entry.enteredQuantity });
        }
      }
      for (const entry of input.recipes) {
        if ("snapshotId" in entry) {
          const snapshot = snapshotById.get(entry.snapshotId);
          if (!snapshot) return failure("validation", "A selected Recipe does not belong to this issuance.");
          if (recipeIds.has(snapshot.recipeId)) return failure("validation", "A Recipe can be selected only once.");
          recipeIds.add(snapshot.recipeId);
        } else {
          if (existing.recipes.some((snapshot) => snapshot.recipeId === entry.recipeId)) return failure("validation", "Saved Recipes must use their snapshot identity. Save a removal before selecting that Recipe again.");
          if (!input.mealPax || !entry.targetPax) return failure("validation", "Enter positive whole-number Meal pax and Recipe target pax before adding Recipes.");
          if (recipeIds.has(entry.recipeId)) return failure("validation", "A Recipe can be selected only once.");
          recipeIds.add(entry.recipeId);
          const source = await getRecipeIssuanceSourceRecord(entry.recipeId, transaction);
          if (!source || source.sourceRevision !== entry.sourceRevision) return failure("source-changed", "A selected Recipe or its ingredients changed. Remove it and select it again to review the current quantities.");
          additions.push({ entry, source });
        }
      }
      if (!existing.id && !input.recipes.length && !input.stockItems?.length) return failure("validation", "Add a Recipe or Stock item before saving the first draft.");
      const recordId = existing.id ?? crypto.randomUUID();
      if (!existing.id) await transaction.issuanceRecord.create({ data: { id: recordId, mealScheduleId: context.mealScheduleId, mealPax: input.mealPax } });
      else await transaction.issuanceRecord.update({ where: { id: recordId }, data: { mealPax: input.mealPax } });
      await transaction.issuanceStockItem.deleteMany({ where: { issuanceRecordId: recordId, id: { notIn: [...retainedStockIds] } } });
      for (const selection of stockSelections) {
        const data = { ...selection.source, enteredQuantity: selection.enteredQuantity };
        if (selection.lineId) await transaction.issuanceStockItem.update({ where: { id: selection.lineId }, data });
        else await transaction.issuanceStockItem.create({ data: { id: crypto.randomUUID(), issuanceRecordId: recordId, ...data } });
      }
      const retainedIds = input.recipes.flatMap((entry) => "snapshotId" in entry ? [entry.snapshotId] : []);
      const removedIds = existing.recipes.filter((recipe) => !retainedIds.includes(recipe.id)).map((recipe) => recipe.id);
      await transaction.issuanceRecipeIngredient.deleteMany({ where: { recipeSnapshotId: { in: removedIds } } });
      await transaction.issuanceRecipeSnapshot.deleteMany({ where: { id: { in: removedIds } } });
      for (const entry of input.recipes) if ("snapshotId" in entry) await transaction.issuanceRecipeSnapshot.update({ where: { id: entry.snapshotId }, data: { targetMode: entry.targetMode, targetPax: entry.targetPax } });
      for (const { entry, source } of additions) await transaction.issuanceRecipeSnapshot.create({ data: {
        id: crypto.randomUUID(), issuanceRecordId: recordId, recipeId: source.recipeId, recipeName: source.recipeName,
        baselinePax: source.baselinePax, sourceRevision: source.sourceRevision, targetMode: entry.targetMode, targetPax: entry.targetPax,
        ingredients: { create: source.ingredients.map((ingredient) => ({ id: crypto.randomUUID(), ...ingredientCopy(ingredient) })) },
      } });
      const proposed = (await getIssuanceWorkspaceRecord(context, transaction))!;
      const resets = new Set(input.resetItemIds ?? []);
      if (resets.size !== (input.resetItemIds?.length ?? 0) || [...resets].some((itemId) => !existing.itemTotals?.some((total) => total.itemId === itemId && total.adjusted))) return failure("validation", "Reset only an existing adjusted Item total.");
      const before = issuanceDemandSignatures(existing);
      const after = issuanceDemandSignatures(proposed.draft);
      for (const total of existing.itemTotals ?? []) if (total.adjusted && !resets.has(total.itemId) && before.get(total.itemId) !== after.get(total.itemId)) return failure("validation", `Reset the confirmed quantity for ${workspace.review.find((item) => item.itemId === total.itemId)?.itemName ?? "the affected Item"} before changing its demand.`);
      proposed.draft.itemTotals = (proposed.draft.itemTotals ?? []).filter((total) => !resets.has(total.itemId));
      const calculation = calculateIssuanceReview(proposed.draft, proposed.reviewReferences);
      const seen = new Set<string>();
      for (const edit of input.quantityReviews ?? []) {
        if (seen.has(edit.itemId)) return failure("validation", "Review an Item quantity only once.");
        seen.add(edit.itemId);
        const total = calculation.review.find((item) => item.itemId === edit.itemId);
        if (!total) return failure("validation", "The reviewed Item does not belong to this issuance.");
        if (proposed.draft.recipes.some((recipe) => !recipe.targetPax && recipe.ingredients.some((ingredient) => ingredient.itemId === edit.itemId))) return failure("validation", "Enter Recipe target pax before confirming its combined quantity.");
        const final = decimalRational(edit.finalQuantity);
        if (total.policy === "whole-only" && !isWholeRational(final)) return failure("validation", `${total.itemName} requires a positive whole-number final quantity.`);
        const adjusted = confirmationIsAdjustment(total, edit.finalQuantity);
        total.finalQuantity = finiteDecimal(final)!;
        total.adjusted = adjusted;
      }
      // Exact source provenance and the accepted final decimal are stored independently.
      await transaction.issuanceItemTotal.deleteMany({ where: { issuanceRecordId: recordId } });
      for (const total of calculation.review) await transaction.issuanceItemTotal.create({ data: { id: crypto.randomUUID(), issuanceRecordId: recordId, itemId: total.itemId, calculatedNumerator: total.calculatedNumerator, calculatedDenominator: total.calculatedDenominator, finalQuantity: total.finalQuantity, adjusted: total.adjusted } });
      return { ok: true, value: (await getIssuanceWorkspaceRecord(context, transaction))! };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof DraftRejected) return error.result;
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034", "P1008", "P2028"].includes(error.code)) return { ok: false, kind: "conflict", error: "Another save is in progress or this draft changed. Reopen issuance and try again." };
    if (error instanceof Error && /SQLITE_BUSY|database is locked|SocketTimeout/i.test(error.message)) return { ok: false, kind: "busy", error: "Another save is in progress. Try again shortly." };
    throw error;
  }
}


