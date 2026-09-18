import "server-only";

import {
  purchaseOrderFieldErrors,
  purchaseOrderSchema,
} from "../../schemas/purchase-order";
import type {
  PurchaseOrderFieldErrors,
  PurchaseOrderUpdateResult,
} from "../../types";
import {
  isRecordNotFound,
  isUniqueConstraintViolation,
  updatePurchaseOrderWithEligibleVendor,
} from "../db/purchase-orders";

function validationResult(
  fields: PurchaseOrderFieldErrors,
  error = "Please correct the highlighted Purchase Order fields.",
): PurchaseOrderUpdateResult {
  return { ok: false, kind: "validation", error, fields };
}

function duplicateResult(): PurchaseOrderUpdateResult {
  const message = "A Purchase Order with that number already exists.";

  return {
    ok: false,
    kind: "duplicate",
    error: message,
    fields: { purchaseOrderNo: [message] },
  };
}

function notFoundResult(): PurchaseOrderUpdateResult {
  return {
    ok: false,
    kind: "not-found",
    error: "The Purchase Order could not be found.",
    fields: {},
  };
}

export async function updatePurchaseOrderCommand(
  id: string,
  input: unknown,
): Promise<PurchaseOrderUpdateResult> {
  const parsedInput = purchaseOrderSchema.safeParse(input);

  if (!parsedInput.success) {
    return validationResult(purchaseOrderFieldErrors(parsedInput.error));
  }

  try {
    const result = await updatePurchaseOrderWithEligibleVendor(
      id,
      parsedInput.data,
    );

    if (result.kind === "not-found") return notFoundResult();
    if (result.kind === "duplicate") return duplicateResult();
    if (result.kind === "invalid-vendor") {
      return {
        ok: false,
        kind: "inactive",
        error: "Please choose an active Vendor or keep the assigned Vendor.",
        fields: { vendorId: ["Select an active Vendor."] },
      };
    }

    return { ok: true, purchaseOrder: result.purchaseOrder };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) return duplicateResult();
    if (isRecordNotFound(error)) return notFoundResult();

    throw error;
  }
}
