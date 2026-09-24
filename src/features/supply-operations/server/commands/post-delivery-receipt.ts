import "server-only";

import { deliveryReceiptFieldErrors, deliveryReceiptSchema } from "../../schemas/delivery-receipt";
import type { DeliveryReceiptPostResult } from "../../types";
import { postDeliveryReceiptWithSelectedUnit } from "../db/delivery-receipts";

export async function postDeliveryReceiptCommand(input: unknown): Promise<DeliveryReceiptPostResult> {
  const parsed = deliveryReceiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, kind: "validation", error: "Please correct the highlighted Delivery Receipt fields.", fields: deliveryReceiptFieldErrors(parsed.error) };
  const result = await postDeliveryReceiptWithSelectedUnit(parsed.data);
  if (result.kind === "created") return { ok: true, receipt: result.receipt };
  if (result.kind === "duplicate") return { ok: false, kind: "duplicate", error: "A Delivery Receipt with that number already exists for this Vendor.", fields: { receiptNo: ["A Delivery Receipt with that number already exists for this Vendor."] } };
  if (result.kind === "inactive-item") return { ok: false, kind: "inactive", error: "Select an active Item.", fields: { itemId: ["Select an active Item."], lines: { [result.lineIndex]: { itemId: ["Select an active Item."] } } } };
  if (result.kind === "invalid-unit") return { ok: false, kind: "inactive", error: "Select an available Unit for this Item.", fields: { selectedUnitId: ["Select an available Unit for this Item."], lines: { [result.lineIndex]: { selectedUnitId: ["Select an available Unit for this Item."] } } } };
  return { ok: false, kind: "not-found", error: "The Purchase Order could not be found.", fields: {} };
}
