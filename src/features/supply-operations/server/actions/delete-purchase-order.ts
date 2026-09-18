import "server-only";

import { revalidatePath } from "next/cache";

import { deletePurchaseOrder } from "../../server";
import type { PurchaseOrderDeleteActionState } from "../../types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeDeletePurchaseOrder(
  id: string,
): Promise<PurchaseOrderDeleteActionState> {
  const actor = await getCurrentSupplyOperationsActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (!id.trim()) {
    return {
      status: "error",
      kind: "not-found",
      error: "The Purchase Order could not be found.",
    };
  }

  try {
    const result = await deletePurchaseOrder(actor, id);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/purchase-orders");
    return { status: "success" };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Purchase Order could not be deleted. Check your connection and try again.",
    };
  }
}
