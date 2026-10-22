import "server-only";
import { Prisma } from "@/prisma/generated/client";
import type { PrismaClient } from "@/prisma/generated/client";
import { prisma } from "@/prisma/client";
import type { CurrentActor } from "@/server/auth";
import type { IssuanceContext, IssuanceErrorKind, IssuanceFailure, IssuanceResult, IssuanceWorkspace, IssuanceReviewItem } from "../../types";
import { allocatePostedItemReceipts, FifoAllocationError } from "./fifo";
import { getIssuanceWorkspaceRecord } from "./drafts";
import { isValidIssuanceFinalQuantity } from "../../domain/quantities";
import { compareRational, decimalRational, displayRational, recipeContribution } from "../../domain/rational";
import { InvalidStockEvidenceError } from "@/features/supply-operations/domain/inventory";

class PostingRejected extends Error {
  readonly result: IssuanceFailure;
  constructor(kind: IssuanceErrorKind, error: string) { super(error); this.result = { ok: false, kind, error }; }
}
function reject(kind: IssuanceErrorKind, error: string): never { throw new PostingRejected(kind, error); }

/** Database-only hooks permit real rollback/lock tests; no public action accepts them. */
type PostingHooks = { afterFirstMovement?: () => void | Promise<void> };
export async function postIssuanceRecord(actor: CurrentActor, context: IssuanceContext, revision: number, database: Pick<PrismaClient, "$transaction"> = prisma, hooks: PostingHooks = {}): Promise<IssuanceResult<IssuanceWorkspace>> {
  try {
    return await database.$transaction(async (transaction) => {
      // SQLite BEGIN is deferred: this MUST be the first statement. Acquire the
      // writer lock before actor, reference, balance, or draft reads.
      const claim = await transaction.issuanceRecord.updateMany({ where: { mealScheduleId: context.mealScheduleId, status: "draft", revision }, data: { revision: { increment: 1 } } });
      const persistedActor = await transaction.user.findFirst({ where: { id: actor.id, disabled: false, role: { in: ["staff", "admin"] } }, select: { id: true, name: true, username: true } });
      if (!persistedActor) reject("forbidden", "Sign in as active kitchen staff or an administrator to post issuance.");
      const workspace = await getIssuanceWorkspaceRecord(context, transaction);
      if (!workspace || !workspace.draft.id) reject("not-found", "Save supply lines in this Meal Schedule before posting issuance.");
      // Successful network retries return immutable history, even with an old revision.
      if (workspace.draft.status === "posted") return { ok: true, value: workspace };
      if (claim.count !== 1) reject("conflict", "This draft changed. Reopen issuance and review the current quantities before posting.");
      if (workspace.reviewPending || !workspace.draft.mealPax) reject("validation", "Enter positive whole-number Meal pax and complete Recipe target pax, then save before posting.");
      if (!workspace.review.length) reject("validation", "Add and save at least one Recipe or Stock item before posting.");

      const sources = [...workspace.draft.stockItems, ...workspace.draft.recipes.flatMap((recipe) => recipe.ingredients)];
      const items = await transaction.item.findMany({ where: { id: { in: workspace.review.map((row) => row.itemId) } }, include: { baseUnit: true } });
      const units = await transaction.unit.findMany({ where: { id: { in: sources.flatMap((source) => [source.baseUnitId, source.selectedUnitId]) } } });
      const itemById = new Map(items.map((item) => [item.id, item]));
      const unitById = new Map(units.map((unit) => [unit.id, unit]));
      for (const source of sources) {
        const item = itemById.get(source.itemId);
        if (!item?.isActive || !item.baseUnit.active || !unitById.get(source.selectedUnitId)?.active || !unitById.get(source.baseUnitId)?.active || item.baseUnitId !== source.baseUnitId) reject("reference", `${source.itemName}: Item or selected/Base Unit is unavailable or its Base Unit changed. Review this selection before posting.`);
      }
      for (const row of workspace.review) {
        const final = decimalRational(row.finalQuantity);
        if (final.numerator <= BigInt(0)) reject("validation", `${row.itemName}: confirm a positive final quantity in ${row.baseUnitAbbreviation}.`);
        if (row.warning || !isValidIssuanceFinalQuantity(row.finalQuantity, row.policy)) reject("policy", `${row.itemName}: current policy requires a whole final quantity. Review and confirm its combined quantity before posting.`);
        const savedTotal = workspace.draft.itemTotals?.find((total) => total.itemId === row.itemId);
        if (!savedTotal || compareRational(decimalRational(savedTotal.finalQuantity), final) !== 0) reject("policy", `${row.itemName}: the current quantity policy changes its final quantity. Review and save the current combined quantities before posting.`);
        if (row.shortage) reject("shortage", `${row.itemName}: requires ${row.finalQuantity} ${row.baseUnitAbbreviation}; available ${row.availableQuantity} ${row.baseUnitAbbreviation}. Reduce demand or receive stock before posting.`);
      }
      const postedAt = new Date();
      // Capture live display evidence once; snapshot arithmetic remains authoritative.
      const historicalReview: IssuanceReviewItem[] = workspace.review.map((row) => {
        const item = itemById.get(row.itemId)!;
        return { ...row, itemName: item.name, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation };
      });
      const historicalRecipes = workspace.draft.recipes.map((recipe) => ({ ...recipe, ingredients: recipe.ingredients.map((ingredient) => {
        const contribution = recipeContribution(ingredient.enteredQuantity, recipe.targetPax!, recipe.baselinePax);
        return { ...ingredient, postedContribution: { ...displayRational(contribution), numerator: contribution.numerator.toString(), denominator: contribution.denominator.toString() } };
      }) }));
      const result: IssuanceWorkspace = { ...workspace, draft: { ...workspace.draft, status: "posted", recipes: historicalRecipes, itemTotals: historicalReview.map(({ itemId, calculatedNumerator, calculatedDenominator, finalQuantity, adjusted }) => ({ itemId, calculatedNumerator, calculatedDenominator, finalQuantity, adjusted })) }, review: historicalReview, posted: { postedAt: postedAt.toISOString(), actorId: persistedActor.id, actorName: persistedActor.name, actorUsername: persistedActor.username ?? "" } };
      for (const [index, row] of historicalReview.entries()) {
        const total = await transaction.issuanceItemTotal.upsert({ where: { issuanceRecordId_itemId: { issuanceRecordId: workspace.draft.id, itemId: row.itemId } }, create: { id: crypto.randomUUID(), issuanceRecordId: workspace.draft.id, itemId: row.itemId, calculatedNumerator: row.calculatedNumerator, calculatedDenominator: row.calculatedDenominator, finalQuantity: row.finalQuantity, adjusted: row.adjusted }, update: { calculatedNumerator: row.calculatedNumerator, calculatedDenominator: row.calculatedDenominator, finalQuantity: row.finalQuantity, adjusted: row.adjusted } });
        row.receiptAllocations = await allocatePostedItemReceipts(transaction, total.id, row.itemId, row.baseUnitId, row.finalQuantity);
        await transaction.inventoryLedgerMovement.create({ data: { id: crypto.randomUUID(), issuanceItemTotalId: total.id, itemId: row.itemId, baseUnitId: row.baseUnitId, quantity: row.finalQuantity, movementType: "stock-out", occurredAt: postedAt } });
        if (index === 0) await hooks.afterFirstMovement?.();
      }
      const transition = await transaction.issuanceRecord.updateMany({ where: { id: workspace.draft.id, status: "draft", revision: revision + 1 }, data: { status: "posted", postedAt, postingEvidence: JSON.stringify(result) } });
      if (transition.count !== 1) reject("conflict", "This draft changed while posting. Reopen and review issuance.");
      return { ok: true, value: result };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 15000 });
  } catch (error) {
    if (error instanceof InvalidStockEvidenceError) return { ok: false, kind: "reference", error: error.message };
    if (error instanceof FifoAllocationError) return { ok: false, kind: "reference", error: error.message };
    if (error instanceof PostingRejected) return error.result;
    if (error instanceof Error && /SQLITE_BUSY|database is locked|SocketTimeout/i.test(error.message)) return { ok: false, kind: "busy", error: "Another stock transaction is in progress. Try posting again shortly; no stock was deducted by this attempt." };
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P1008", "P2028"].includes(error.code)) return { ok: false, kind: "busy", error: "Another stock transaction is in progress. Try again shortly; no stock was deducted by this attempt." };
    throw error;
  }
}

