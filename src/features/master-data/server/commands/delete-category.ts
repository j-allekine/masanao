import "server-only";

import type { CategoryDeleteResult } from "../../types";
import { deleteCategoryRecord } from "../db/categories";

export async function deleteCategoryCommand(
  id: string,
): Promise<CategoryDeleteResult> {
  const result = await deleteCategoryRecord(id);
  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Category could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "referenced",
      error:
        "This Category cannot be deleted because it is already referenced by other records.",
    };
  }

  return { ok: true };
}
