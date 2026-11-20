import "server-only";
import { revalidatePath } from "next/cache";
import { createItemWithConversions } from "../../server";
import type { ItemWithConversionsResult } from "../../item-with-conversions-types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeCreateItemWithConversions(input: unknown): Promise<ItemWithConversionsResult> {
  const actor = await getCurrentSupplyOperationsActor();
  try {
    const result = await createItemWithConversions(actor, input);
    if (result.ok) {
      revalidatePath("/items");
      revalidatePath("/inventory");
      revalidatePath("/inventory/opening-stock");
    }
    return result;
  } catch {
    return { ok: false, kind: "server", error: "The Item and alternate units could not be saved. Your entries are retained; try again.", fields: {} };
  }
}
