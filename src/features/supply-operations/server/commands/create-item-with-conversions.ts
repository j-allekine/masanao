import "server-only";
import type { CurrentActor } from "@/server/auth";
import type { ItemWithConversionsResult } from "../../item-with-conversions-types";
import { itemWithConversionsErrors, itemWithConversionsSchema } from "../../schemas/item-with-conversions";
import { createItemWithConversionsRecord } from "../db/items";

export async function createItemWithConversionsCommand(actor: CurrentActor | null | undefined, input: unknown): Promise<ItemWithConversionsResult> {
  if (!actor) return { ok: false, kind: "forbidden", error: "Administrator access required.", fields: {} };
  const parsed = itemWithConversionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, kind: "validation", error: "Please correct the highlighted Item and conversion fields.", fields: itemWithConversionsErrors(parsed.error) };
  return createItemWithConversionsRecord(actor, parsed.data);
}
