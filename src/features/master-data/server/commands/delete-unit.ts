import "server-only";

import type { UnitDeleteResult } from "../../types";
import { deleteUnitRecord } from "../db/units";

export async function deleteUnitCommand(
  id: string,
): Promise<UnitDeleteResult> {
  const result = await deleteUnitRecord(id);
  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Unit could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "referenced",
      error:
        "This Unit cannot be deleted because it is already referenced by other records.",
    };
  }

  return { ok: true };
}
