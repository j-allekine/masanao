import "server-only";
import type { CurrentActor } from "@/server/auth";
import { correctionBeginSchema, correctionSaveSchema, correctionPostSchema, correctionRevisionSchema } from "../../schemas/opening-stock-corrections";
import { beginOpeningStockCorrectionRecord, saveOpeningStockCorrectionRecord, postOpeningStockCorrectionRecord, discardOpeningStockCorrectionRecord } from "../db/opening-stock-corrections";
import type { OpeningStockResult } from "../../opening-stock-types";
import type { z } from "zod";
function invalid(error: z.ZodError): OpeningStockResult<never> { const fields: Record<string,string> = {}; for (const issue of error.issues) fields[issue.path.join(".")] ??= issue.message; return { ok:false, kind:"validation", error:"Correct the highlighted correction fields. Posting time is managed by the system.", fields }; }
export async function beginOpeningStockCorrectionCommand(actor: CurrentActor | null | undefined, input: unknown) { const parsed = correctionBeginSchema.safeParse(input); return parsed.success ? beginOpeningStockCorrectionRecord(actor, parsed.data) : invalid(parsed.error); }
export async function saveOpeningStockCorrectionCommand(actor: CurrentActor | null | undefined, input: unknown) { const parsed = correctionSaveSchema.safeParse(input); return parsed.success ? saveOpeningStockCorrectionRecord(actor, parsed.data) : invalid(parsed.error); }
export async function postOpeningStockCorrectionCommand(actor: CurrentActor | null | undefined, input: unknown) { const parsed = correctionPostSchema.safeParse(input); return parsed.success ? postOpeningStockCorrectionRecord(actor, parsed.data) : invalid(parsed.error); }
export async function discardOpeningStockCorrectionCommand(actor: CurrentActor | null | undefined, input: unknown) { const parsed = correctionRevisionSchema.safeParse(input); return parsed.success ? discardOpeningStockCorrectionRecord(actor, parsed.data) : invalid(parsed.error); }
