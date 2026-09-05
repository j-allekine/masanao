import "server-only";

import type { OfficeDeleteResult } from "../../types";
import { deleteOfficeRecord } from "../db/offices";

export async function deleteOfficeCommand(
  id: string,
): Promise<OfficeDeleteResult> {
  const result = await deleteOfficeRecord(id);
  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Office could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "referenced",
      error:
        "This Office cannot be deleted because it is already referenced by other records.",
    };
  }

  return { ok: true };
}
