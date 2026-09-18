import "server-only";

import { revalidatePath } from "next/cache";

import { updatePurchaseOrder } from "../../server";
import type { PurchaseOrderFormActionState } from "../../types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeUpdatePurchaseOrder(
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

  const id = formData.get("id");
  if (typeof id !== "string" || id.trim() === "") {
    return {
      status: "error",
      kind: "not-found",
      error: "The Purchase Order could not be found.",
      fields: {},
    };
  }

  const input = Object.fromEntries(formData.entries());
  delete input.id;

  try {
    const result = await updatePurchaseOrder(actor, id, input);

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
