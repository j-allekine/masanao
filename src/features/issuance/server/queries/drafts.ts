import "server-only";
import type { CurrentActor } from "@/server/auth";
import { getRecipeIssuanceSourceRecord } from "@/features/recipes/server/db/issuance-source";
import { contextSchema } from "../../schemas/draft";
import { actorCanUseIssuance, getIssuanceWorkspaceRecord, listIssuanceRecipeOptionRecords } from "../db/drafts";
import { listIssuanceStockItemOptionRecords } from "../db/stock-items";
import type { IssuanceContext, IssuanceRecipeOption, IssuanceRecipeSource, IssuanceResult, IssuanceWorkspace } from "../../types";
import { z } from "zod";
import { getIssuanceReviewReferences } from "../db/quantities";
export async function getIssuanceReviewReferencesQuery(actor: CurrentActor | null | undefined, itemIds: unknown) {
  if (!await actorCanUseIssuance(actor)) return { ok: false as const, kind: actor ? "forbidden" as const : "authentication" as const, error: "Authentication required." };
  const parsed = z.array(z.string().min(1)).safeParse(itemIds);
  if (!parsed.success) return { ok: false as const, kind: "validation" as const, error: "Select valid Items for quantity review." };
  return { ok: true as const, value: await getIssuanceReviewReferences(parsed.data) };
}
export async function getIssuanceWorkspaceQuery(actor: CurrentActor | null | undefined, context: IssuanceContext): Promise<IssuanceResult<IssuanceWorkspace>> {
  if (!await actorCanUseIssuance(actor)) return { ok: false, kind: actor ? "forbidden" : "authentication", error: "Sign in as kitchen staff or an administrator to prepare issuance." };
  const parsed = contextSchema.safeParse(context);
  if (!parsed.success) return { ok: false, kind: "validation", error: "Invalid Meal Schedule context." };
  const workspace = await getIssuanceWorkspaceRecord(parsed.data);
  return workspace ? { ok: true, value: workspace } : { ok: false, kind: "not-found", error: "Meal Schedule not found." };
}
export async function listIssuanceRecipesQuery(actor: CurrentActor | null | undefined): Promise<IssuanceResult<IssuanceRecipeOption[]>> {
  if (!await actorCanUseIssuance(actor)) return { ok: false, kind: actor ? "forbidden" : "authentication", error: "Authentication required." };
  return { ok: true, value: await listIssuanceRecipeOptionRecords() };
}
export async function previewIssuanceRecipeQuery(actor: CurrentActor | null | undefined, recipeId: string): Promise<IssuanceResult<IssuanceRecipeSource>> {
  if (!await actorCanUseIssuance(actor)) return { ok: false, kind: actor ? "forbidden" : "authentication", error: "Authentication required." };
  if (typeof recipeId !== "string" || !recipeId) return { ok: false, kind: "validation", error: "Select a Recipe." };
  const source = await getRecipeIssuanceSourceRecord(recipeId);
  return source ? { ok: true, value: source } : { ok: false, kind: "validation", error: "Select an active Recipe with baseline pax and available ingredients." };
}
export async function listIssuanceStockItemsQuery(actor: CurrentActor | null | undefined) {
  if (!await actorCanUseIssuance(actor)) return { ok: false as const, kind: actor ? "forbidden" as const : "authentication" as const, error: "Authentication required." };
  return { ok: true as const, value: await listIssuanceStockItemOptionRecords() };
}
