import "server-only";

import { getPurchaseOrderDeliverySummaries } from "../db/purchase-orders";

export async function readPurchaseOrderDeliverySummaries(ids: readonly string[]) {
  return getPurchaseOrderDeliverySummaries(ids);
}
