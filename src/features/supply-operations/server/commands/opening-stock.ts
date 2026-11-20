import "server-only";
import type { CurrentActor } from "@/server/auth";
import { openingStockAttemptSchema, openingStockSaveSchema } from "../../schemas/opening-stock";
import { beginOpeningStockRecord, discardOpeningStockRecord, saveOpeningStockRecord } from "../db/opening-stock";
import type { OpeningStockResult } from "../../opening-stock-types";
import type { z } from "zod";

function invalid(error: z.ZodError): OpeningStockResult<never> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join(".")] ??= issue.message;
  return { ok: false, kind: "validation", error: "Correct the highlighted count fields.", fields };
}
export async function beginOpeningStockCommand(actor: CurrentActor | null | undefined, input: unknown) {
  const parsed = openingStockAttemptSchema.safeParse(input);
  return parsed.success ? beginOpeningStockRecord(actor, parsed.data) : invalid(parsed.error);
}
export async function saveOpeningStockCommand(actor: CurrentActor | null | undefined, input: unknown) {
  const parsed = openingStockSaveSchema.safeParse(input);
  return parsed.success ? saveOpeningStockRecord(actor, parsed.data) : invalid(parsed.error);
}
export async function discardOpeningStockCommand(actor: CurrentActor | null | undefined, input: unknown) {
  const parsed = openingStockAttemptSchema.safeParse(input);
  return parsed.success ? discardOpeningStockRecord(actor, parsed.data) : invalid(parsed.error);
}
