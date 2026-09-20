import "server-only";

import { revalidatePath } from "next/cache";
import { postDeliveryReceipt } from "../../server";
import type { DeliveryReceiptPostActionState } from "../../types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executePostDeliveryReceipt(formData: FormData): Promise<DeliveryReceiptPostActionState> {
  const actor = await getCurrentSupplyOperationsActor();
  if (!actor) return { status: "error", kind: "authentication", error: "Authentication required", fields: {} };
  try {
    const input = Object.fromEntries(formData.entries());
    if (typeof input.lines === "string") input.lines = JSON.parse(input.lines);
    const result = await postDeliveryReceipt(actor, input);
    if (!result.ok) return { status: "error", kind: result.kind, error: result.error, fields: result.fields };
    revalidatePath(`/purchase-orders/${formData.get("purchaseOrderId")}`);
    return { status: "success", receipt: result.receipt };
  } catch {
    return { status: "error", kind: "server", error: "The Delivery Receipt could not be posted. Check your connection and try again.", fields: {} };
  }
}
