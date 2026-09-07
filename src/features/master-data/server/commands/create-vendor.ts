import "server-only";

import { vendorFieldErrors, vendorSchema } from "../../schemas/vendor";
import type { VendorCreateResult } from "../../types";
import {
  createVendorRecord,
  findVendorConflictRecord,
  getVendorDuplicateField,
  isUniqueConstraintViolation,
} from "../db/vendors";

const duplicateMessage = "A Vendor with that name already exists.";

function duplicateResult(): VendorCreateResult {
  return {
    ok: false,
    kind: "duplicate",
    error: duplicateMessage,
    fields: { name: [duplicateMessage] },
  };
}

export async function createVendorCommand(
  input: unknown,
): Promise<VendorCreateResult> {
  const parsedInput = vendorSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Vendor fields.",
      fields: vendorFieldErrors(parsedInput.error),
    };
  }

  if (await findVendorConflictRecord(parsedInput.data)) {
    return duplicateResult();
  }

  try {
    return {
      ok: true,
      vendor: await createVendorRecord(parsedInput.data),
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

    throw error;
  }
}
