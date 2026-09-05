import "server-only";

import type { CategoryLifecycleResult } from "../../types";
import {
  isRecordNotFound,
  setCategoryActiveRecord,
} from "../db/categories";

export async function setCategoryActiveCommand(
  id: string,
  isActive: boolean,
): Promise<CategoryLifecycleResult> {
  try {
    return {
      ok: true,
      category: await setCategoryActiveRecord(id, isActive),
    };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Category could not be found.",
      };
    }

    throw error;
  }
}
