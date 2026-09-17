import "server-only";

import { listPurchaseOrderRecords } from "../db/purchase-orders";

export async function listPurchaseOrders() {
  return listPurchaseOrderRecords();
}
