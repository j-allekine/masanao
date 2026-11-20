import "server-only";
import { revalidatePath } from "next/cache";
import { beginOpeningStock, discardOpeningStockDraft, saveOpeningStockDraft } from "../../server";
import { getCurrentSupplyOperationsActor } from "./current-actor";
import type { OpeningStockResult } from "../../opening-stock-types";

export async function executeOpeningStockAction(operation: "begin" | "save" | "discard", input: unknown): Promise<OpeningStockResult<{ revision: number }>> {
  const actor = await getCurrentSupplyOperationsActor();
  try {
    const result = operation === "begin" ? await beginOpeningStock(actor, input) : operation === "save" ? await saveOpeningStockDraft(actor, input) : await discardOpeningStockDraft(actor, input);
    if (result.ok) { revalidatePath("/inventory/opening-stock"); revalidatePath("/inventory"); }
    return result;
  } catch {
    return { ok: false, kind: "server", error: "Opening Stock could not be saved. Your entries are retained; try again." };
  }
}
