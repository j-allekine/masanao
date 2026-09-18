import "server-only";

import { revalidatePath } from "next/cache";

import { createPurchaseOrder } from "../../server";
import type { PurchaseOrderFormActionState } from "../../types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeCreatePurchaseOrder(
  formData: FormData,
): Promise<PurchaseOrderFormActionState> {
  const actor = await getCurrentSupplyOperationsActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
      fields: {},
    };
  }

  try {
    const result = await createPurchaseOrder(
      actor,
      Object.fromEntries(formData.entries()),
    );

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/purchase-orders");
    return { status: "success", purchaseOrder: result.purchaseOrder };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Purchase Order could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
