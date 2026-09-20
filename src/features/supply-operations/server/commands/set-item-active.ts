import "server-only";

import type { ItemLifecycleResult } from "../../types";
import { isRecordNotFound, setItemActiveRecord } from "../db/items";

export async function setItemActiveCommand(
  id: string,
  isActive: boolean,
): Promise<ItemLifecycleResult> {
  try {
    const result = await setItemActiveRecord(id, isActive);
    if (result.kind === "referenced") {
      return {
        ok: false,
        kind: "referenced",
        error: "This Item cannot be deactivated because posted Delivery Receipts reference it.",
      };
    }

    return {
      ok: true,
      item: result.item,
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
