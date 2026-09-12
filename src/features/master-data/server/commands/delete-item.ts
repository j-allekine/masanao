import "server-only";

import type { ItemDeleteResult } from "../../types";
import { deleteItemRecord } from "../db/items";

export async function deleteItemCommand(
  id: string,
): Promise<ItemDeleteResult> {
  const result = await deleteItemRecord(id);
  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Item could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "referenced",
      error:
        "This Item cannot be deleted because it is already referenced by operational records.",
    };
  }

  return { ok: true };
}
