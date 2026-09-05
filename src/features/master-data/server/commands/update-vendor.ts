import "server-only";

import { vendorFieldErrors, vendorSchema } from "../../schemas/vendor";
import type { VendorUpdateResult } from "../../types";
import {
  findVendorConflictRecord,
  getVendorDuplicateField,
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateVendorRecord,
} from "../db/vendors";

const duplicateMessage = "A Vendor with that name already exists.";

function duplicateResult(): VendorUpdateResult {
  return {
    ok: false,
    kind: "duplicate",
    error: duplicateMessage,
    fields: { name: [duplicateMessage] },
  };
}

export async function updateVendorCommand(
  id: string,
  input: unknown,
): Promise<VendorUpdateResult> {
  const parsedInput = vendorSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Vendor fields.",
      fields: vendorFieldErrors(parsedInput.error),
    };
  }

  if (await findVendorConflictRecord(parsedInput.data, id)) {
    return duplicateResult();
  }

  try {
    return {
      ok: true,
      vendor: await updateVendorRecord(id, parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return getVendorDuplicateField(error) === "name"
        ? duplicateResult()
        : {
            ok: false,
            kind: "duplicate",
            error: duplicateMessage,
            fields: { form: [duplicateMessage] },
          };
    }

    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Vendor could not be found.",
        fields: {},
      };
    }

    throw error;
  }
}
