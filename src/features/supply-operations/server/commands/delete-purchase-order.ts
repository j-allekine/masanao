import "server-only";

import type { PurchaseOrderDeleteResult } from "../../types";
import { deletePurchaseOrderRecord } from "../db/purchase-orders";

export async function deletePurchaseOrderCommand(
  id: string,
): Promise<PurchaseOrderDeleteResult> {
  const result = await deletePurchaseOrderRecord(id);
  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Purchase Order could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "referenced",
      error:
        "This Purchase Order cannot be deleted because it has posted Delivery Receipts.",
    };
  }

  return { ok: true };
}
