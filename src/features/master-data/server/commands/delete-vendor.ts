import "server-only";

import type { VendorDeleteResult } from "../../types";
import { deleteVendorRecord } from "../db/vendors";

export async function deleteVendorCommand(
  id: string,
): Promise<VendorDeleteResult> {
  const result = await deleteVendorRecord(id);
  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Vendor could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "referenced",
      error:
        "This Vendor cannot be deleted because it is already referenced by procurement or receiving records.",
    };
  }

  return { ok: true };
}
