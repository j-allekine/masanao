import "server-only";
import { postSchema } from "../../schemas/post";
import type { CurrentActor } from "@/server/auth";
import { contextSchema } from "../../schemas/draft";
import { actorCanUseIssuance } from "../db/drafts";
import { postIssuanceRecord } from "../db/post";
import type { IssuanceContext, IssuanceResult, IssuanceWorkspace } from "../../types";

export async function postIssuanceCommand(actor: CurrentActor | null | undefined, context: IssuanceContext, input: unknown): Promise<IssuanceResult<IssuanceWorkspace>> {
  if (!await actorCanUseIssuance(actor)) return { ok: false, kind: actor ? "forbidden" : "authentication", error: "Sign in as kitchen staff or an administrator to post issuance." };
  const parsedContext = contextSchema.safeParse(context);
  const parsed = postSchema.safeParse(input);
  if (!parsedContext.success || !parsed.success) return { ok: false, kind: "validation", error: "Save a valid current draft before posting issuance." };
  return postIssuanceRecord(actor!, parsedContext.data, parsed.data.revision);
}
