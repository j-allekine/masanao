import { getPurchaseOrderRecord } from "../db/purchase-orders";

export async function getPurchaseOrder(id: string) {
  return getPurchaseOrderRecord(id);
}
