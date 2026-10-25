import "server-only";

import { purchaseOrderSummaryIdsSchema } from "../../schemas/purchase-order-delivery-summary";
import { readPurchaseOrderDeliverySummaries } from "../queries/purchase-order-delivery-summaries";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeReadPurchaseOrderDeliverySummaries(input: unknown) {
  if (!await getCurrentSupplyOperationsActor()) return { ok: false as const };
  const ids = purchaseOrderSummaryIdsSchema.safeParse(input);
  if (!ids.success) return { ok: false as const };
  try {
    return { ok: true as const, summaries: await readPurchaseOrderDeliverySummaries([...new Set(ids.data)]) };
  } catch {
    return { ok: false as const };
  }
}
