import "server-only";

import {
  purchaseOrderFieldErrors,
  purchaseOrderSchema,
} from "../../schemas/purchase-order";
import type {
  PurchaseOrderCreateResult,
  PurchaseOrderFieldErrors,
} from "../../types";
import {
  createPurchaseOrderWithActiveVendor,
  isUniqueConstraintViolation,
} from "../db/purchase-orders";

function validationResult(
  fields: PurchaseOrderFieldErrors,
  error = "Please correct the highlighted Purchase Order fields.",
): PurchaseOrderCreateResult {
  return { ok: false, kind: "validation", error, fields };
}

function duplicateResult(): PurchaseOrderCreateResult {
  const message = "A Purchase Order with that number already exists.";

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: { purchaseOrderNo: [message] },
  };
}

export async function createPurchaseOrderCommand(
  input: unknown,
): Promise<PurchaseOrderCreateResult> {
  const parsedInput = purchaseOrderSchema.safeParse(input);

  if (!parsedInput.success) {
    return validationResult(purchaseOrderFieldErrors(parsedInput.error));
  }

  try {
    const result = await createPurchaseOrderWithActiveVendor(parsedInput.data);

    if (result.kind === "duplicate") return duplicateResult();
    if (result.kind === "invalid-vendor") {
      return {
        ok: false,
        kind: "inactive",
        error: "Please choose an active Vendor.",
        fields: { vendorId: ["Select an active Vendor."] },
      };
    }

    return { ok: true, purchaseOrder: result.purchaseOrder };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return duplicateResult();

    throw error;
  }
}
