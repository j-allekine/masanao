import "server-only";

import { revalidatePath } from "next/cache";
import { createItemUnitConversion } from "../../server";
import type { ItemUnitConversionActionState } from "../../types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeCreateItemUnitConversion(formData: FormData): Promise<ItemUnitConversionActionState> {
  const actor = await getCurrentSupplyOperationsActor();
  if (!actor) return { status: "error", kind: "authentication", error: "Authentication required", fields: {} };
  const itemId = formData.get("itemId");
  if (typeof itemId !== "string" || !itemId.trim()) return { status: "error", kind: "not-found", error: "The Item could not be found.", fields: {} };
  const input = Object.fromEntries(formData.entries());
  delete input.itemId;
  try {
    const result = await createItemUnitConversion(actor, itemId, input);
    if (!result.ok) return { status: "error", kind: result.kind, error: result.error, fields: result.fields };
    revalidatePath("/items");
    return { status: "success", conversion: result.conversion };
  } catch {
    return { status: "error", kind: "server", error: "The alternate Unit could not be saved. Check your connection and try again.", fields: {} };
  }
}
