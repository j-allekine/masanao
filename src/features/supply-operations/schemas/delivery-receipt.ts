import { z } from "zod";

import {
  DELIVERY_RECEIPT_NOTE_MAX_LENGTH,
  DELIVERY_RECEIPT_NUMBER_MAX_LENGTH,
  normalizeDeliveryReceiptNo,
  normalizeDeliveryReceiptNoKey,
  normalizeDeliveryReceiptOptionalValue,
  isPositiveExactDecimal,
} from "../domain/delivery-receipt";
import type { DeliveryReceiptFieldErrors } from "../types";

const receiptNoSchema = z.string({ error: "Receipt number is required" })
  .transform(normalizeDeliveryReceiptNo)
  .pipe(z.string().min(1, "Receipt number is required").max(DELIVERY_RECEIPT_NUMBER_MAX_LENGTH, `Receipt number must be ${DELIVERY_RECEIPT_NUMBER_MAX_LENGTH} characters or fewer`));

const positiveQuantitySchema = z.string({ error: "Quantity is required" }).trim()
  .refine(isPositiveExactDecimal, "Enter a positive quantity");

export const deliveryReceiptSchema = z.object({
  purchaseOrderId: z.string().trim().min(1, "Purchase Order is required"),
  receiptNo: receiptNoSchema,
  receiptDate: z.string().trim().date("Enter a valid receipt date"),
  note: z.string().optional().transform((value) => normalizeDeliveryReceiptOptionalValue(value ?? "")).pipe(z.string().max(DELIVERY_RECEIPT_NOTE_MAX_LENGTH, `Receipt note must be ${DELIVERY_RECEIPT_NOTE_MAX_LENGTH} characters or fewer`)).transform((value) => value || null),
  itemId: z.string().trim().min(1, "Select an Item"),
  selectedUnitId: z.string().trim().min(1, "Select a Unit").optional(),
  conversionId: z.string().trim().min(1).optional(),
  quantity: positiveQuantitySchema,
}).transform((value) => ({ ...value, normalizedReceiptNo: normalizeDeliveryReceiptNoKey(value.receiptNo) }));

export type DeliveryReceiptInput = z.infer<typeof deliveryReceiptSchema>;

export function deliveryReceiptFieldErrors(error: z.ZodError): DeliveryReceiptFieldErrors {
  const fields: DeliveryReceiptFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = field === "receiptNo" || field === "receiptDate" || field === "note" || field === "itemId" || field === "selectedUnitId" || field === "quantity" ? field : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }
  return fields;
}
