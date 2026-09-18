import { z } from "zod";

import {
  normalizePurchaseOrderNo,
  normalizePurchaseOrderNoKey,
  normalizePurchaseOrderOptionalValue,
  PURCHASE_ORDER_NOTE_MAX_LENGTH,
  PURCHASE_ORDER_NUMBER_MAX_LENGTH,
  PURCHASE_ORDER_REFERENCE_NUMBER_MAX_LENGTH,
} from "../domain/purchase-order";
import type { PurchaseOrderFieldErrors } from "../types";

const purchaseOrderNoSchema = z
  .string({ error: "Purchase Order No. is required" })
  .transform(normalizePurchaseOrderNo)
  .pipe(
    z
      .string()
      .min(1, "Purchase Order No. is required")
      .max(
        PURCHASE_ORDER_NUMBER_MAX_LENGTH,
        `Purchase Order No. must be ${PURCHASE_ORDER_NUMBER_MAX_LENGTH} characters or fewer`,
      ),
  );

const vendorIdSchema = z
  .string({ error: "Vendor is required" })
  .trim()
  .min(1, "Vendor is required");

function optionalTextSchema(label: string, maxLength: number) {
  return z
    .string()
    .optional()
    .transform((value) => normalizePurchaseOrderOptionalValue(value ?? ""))
    .pipe(
      z
        .string()
        .max(maxLength, `${label} must be ${maxLength} characters or fewer`),
    )
    .transform((value) => (value === "" ? null : value));
}

export const purchaseOrderSchema = z
  .object({
    purchaseOrderNo: purchaseOrderNoSchema,
    vendorId: vendorIdSchema,
    referenceNumber: optionalTextSchema(
      "Reference number",
      PURCHASE_ORDER_REFERENCE_NUMBER_MAX_LENGTH,
    ),
    note: optionalTextSchema("Note", PURCHASE_ORDER_NOTE_MAX_LENGTH),
  })
  .refine(
    (value) =>
      normalizePurchaseOrderNoKey(value.purchaseOrderNo).length <=
      PURCHASE_ORDER_NUMBER_MAX_LENGTH,
    {
      path: ["purchaseOrderNo"],
      message: `Purchase Order No. must be ${PURCHASE_ORDER_NUMBER_MAX_LENGTH} characters or fewer`,
    },
  )
  .transform((value) => ({
    ...value,
    normalizedPurchaseOrderNo: normalizePurchaseOrderNoKey(value.purchaseOrderNo),
  }));

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export function purchaseOrderFieldErrors(
  error: z.ZodError,
): PurchaseOrderFieldErrors {
  const fields: PurchaseOrderFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key =
      field === "purchaseOrderNo" ||
      field === "vendorId" ||
      field === "referenceNumber" ||
      field === "note"
        ? field
        : "form";
    fields[key] ??= [];
    fields[key]?.push(issue.message);
  }

  return fields;
}
