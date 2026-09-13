import "server-only";

import type { ItemLifecycleResult } from "../../types";
import { isRecordNotFound, setItemActiveRecord } from "../db/items";

export async function setItemActiveCommand(
  id: string,
  isActive: boolean,
): Promise<ItemLifecycleResult> {
  try {
    return {
      ok: true,
      item: await setItemActiveRecord(id, isActive),
    };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Item could not be found.",
      };
    }

    throw error;
  }
}
