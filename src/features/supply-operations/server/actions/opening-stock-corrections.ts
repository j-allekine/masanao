import "server-only";
import { revalidatePath } from "next/cache";
import { beginOpeningStockCorrection, saveOpeningStockCorrection, postOpeningStockCorrection, discardOpeningStockCorrection } from "../../server";
import { getCurrentSupplyOperationsActor } from "./current-actor";
export function executeOpeningStockCorrectionAction(operation: "begin", input: unknown): ReturnType<typeof beginOpeningStockCorrection>;
export function executeOpeningStockCorrectionAction(operation: "save", input: unknown): ReturnType<typeof saveOpeningStockCorrection>;
export function executeOpeningStockCorrectionAction(operation: "post" | "discard", input: unknown): ReturnType<typeof postOpeningStockCorrection>;
export async function executeOpeningStockCorrectionAction(operation: "begin" | "save" | "post" | "discard", input: unknown) {
  const actor = await getCurrentSupplyOperationsActor();
  try {
    const result = operation === "begin" ? await beginOpeningStockCorrection(actor, input) : operation === "save" ? await saveOpeningStockCorrection(actor, input) : operation === "post" ? await postOpeningStockCorrection(actor, input) : await discardOpeningStockCorrection(actor, input);
    if (result.ok) { revalidatePath("/inventory/opening-stock"); revalidatePath("/inventory"); }
    return result;
  } catch { return { ok:false as const, kind:"server" as const, error:"The correction could not be saved. Your entries are retained; try again." }; }
}
