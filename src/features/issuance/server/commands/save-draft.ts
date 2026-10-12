import "server-only";
import type { CurrentActor } from "@/server/auth";
import { contextSchema, saveDraftSchema } from "../../schemas/draft";
import { actorCanUseIssuance, saveIssuanceDraftRecord } from "../db/drafts";
import type { IssuanceContext, IssuanceResult, IssuanceWorkspace } from "../../types";
export async function saveIssuanceDraftCommand(actor: CurrentActor | null | undefined, context: IssuanceContext, input: unknown): Promise<IssuanceResult<IssuanceWorkspace>> {
  if (!await actorCanUseIssuance(actor)) return { ok: false, kind: actor ? "forbidden" : "authentication", error: "Sign in as kitchen staff or an administrator to prepare issuance." };
  const parsedContext = contextSchema.safeParse(context);
  const parsed = saveDraftSchema.safeParse(input);
  if (!parsedContext.success || !parsed.success) return { ok: false, kind: "validation", error: "Enter valid pax and Recipe selections. Copied Recipe ingredients cannot be replaced.", fields: !parsed.success ? Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), [issue.message]])) : {} };
  return saveIssuanceDraftRecord(parsedContext.data, parsed.data);
}
