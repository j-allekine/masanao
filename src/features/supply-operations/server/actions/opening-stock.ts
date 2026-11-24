import "server-only";
import { revalidatePath } from "next/cache";
import { beginOpeningStock, discardOpeningStockDraft, postOpeningStock, saveOpeningStockDraft } from "../../server";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export function executeOpeningStockAction(operation: "save", input: unknown): ReturnType<typeof saveOpeningStockDraft>;
export function executeOpeningStockAction(operation: "begin" | "discard" | "post", input: unknown): ReturnType<typeof beginOpeningStock>;
export async function executeOpeningStockAction(operation: "begin" | "save" | "discard" | "post", input: unknown) {
  const actor = await getCurrentSupplyOperationsActor();
  try {
    const result = operation === "begin" ? await beginOpeningStock(actor, input) : operation === "save" ? await saveOpeningStockDraft(actor, input) : operation === "post" ? await postOpeningStock(actor, input) : await discardOpeningStockDraft(actor, input);
    if (result.ok) { revalidatePath("/inventory/opening-stock"); revalidatePath("/inventory"); }
    return result;
  } catch {
    return { ok: false as const, kind: "server" as const, error: "Opening Stock could not be saved. Your entries are retained; try again." };
  }
}
