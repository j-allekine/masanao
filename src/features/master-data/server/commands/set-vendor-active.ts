import "server-only";

import type { VendorLifecycleResult } from "../../types";
import { isRecordNotFound, setVendorActiveRecord } from "../db/vendors";

export async function setVendorActiveCommand(
  id: string,
  isActive: boolean,
): Promise<VendorLifecycleResult> {
  try {
    return {
      ok: true,
      vendor: await setVendorActiveRecord(id, isActive),
    };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Vendor could not be found.",
      };
    }

    throw error;
  }
}
