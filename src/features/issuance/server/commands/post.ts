import "server-only";
import { z } from "zod";
import type { CurrentActor } from "@/server/auth";
import { contextSchema } from "../../schemas/draft";
import { actorCanUseIssuance } from "../db/drafts";
import { postIssuanceRecord } from "../db/post";
import type { IssuanceContext, IssuanceResult, IssuanceWorkspace } from "../../types";

const postSchema = z.object({ revision: z.number().int().positive().max(2147483647) }).strict();
export async function postIssuanceCommand(actor: CurrentActor | null | undefined, context: IssuanceContext, input: unknown): Promise<IssuanceResult<IssuanceWorkspace>> {
  if (!await actorCanUseIssuance(actor)) return { ok: false, kind: actor ? "forbidden" : "authentication", error: "Sign in as kitchen staff or an administrator to post issuance." };
  const parsedContext = contextSchema.safeParse(context);
  const parsed = postSchema.safeParse(input);
  if (!parsedContext.success || !parsed.success) return { ok: false, kind: "validation", error: "Save a valid current draft before posting issuance." };
  return postIssuanceRecord(actor!, parsedContext.data, parsed.data.revision);
}
