import "server-only";
import { Prisma } from "@/prisma/generated/client";
import type { PrismaClient } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import { getRecipeIssuanceSourceRecord, listRecipeIssuanceOptionRecords } from "@/features/recipes/server/db/issuance-source";
import type { SaveDraftInput } from "../../schemas/draft";
import type { IssuanceContext, IssuanceDraft, IssuanceResult, IssuanceWorkspace, IssuanceRecipeOption, IssuanceIngredient } from "../../types";

type IssuanceDatabase = Pick<Prisma.TransactionClient, "mealSchedule" | "issuanceRecord" | "issuanceRecipeSnapshot" | "issuanceRecipeIngredient" | "recipe" | "user">;
const recordInclude = { recipes: { include: { ingredients: true }, orderBy: { id: "asc" as const } } };
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
  const draft: IssuanceDraft = record ? {
    id: record.id,
    revision: record.revision,
    status: record.status === "posted" ? "posted" : "draft",
    mealPax: record.mealPax,
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
  };
  return { context: { ...context, activityDesignNo: meal.activity.activityDesign.activityDesignNo, activityDesignTitle: meal.activity.activityDesign.title, activityName: meal.activity.name, mealLabel: meal.label, mealTime: meal.mealTime, plannedPax: meal.activity.plannedParticipantCount }, draft };
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
      if (!existing.id && !input.recipes.length) return failure("validation", "Add a Recipe before saving the first draft.");
      const recordId = existing.id ?? crypto.randomUUID();
      if (!existing.id) await transaction.issuanceRecord.create({ data: { id: recordId, mealScheduleId: context.mealScheduleId, mealPax: input.mealPax } });
      else await transaction.issuanceRecord.update({ where: { id: recordId }, data: { mealPax: input.mealPax } });
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
      return { ok: true, value: (await getIssuanceWorkspaceRecord(context, transaction))! };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof DraftRejected) return error.result;
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034", "P1008", "P2028"].includes(error.code)) return { ok: false, kind: "conflict", error: "Another save is in progress or this draft changed. Reopen issuance and try again." };
    if (error instanceof Error && /SQLITE_BUSY|database is locked|SocketTimeout/i.test(error.message)) return { ok: false, kind: "busy", error: "Another save is in progress. Try again shortly." };
    throw error;
  }
}


