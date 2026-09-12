import "server-only";

import type { OfficeLifecycleResult } from "../../types";
import {
  isRecordNotFound,
  setOfficeActiveRecord,
} from "../db/offices";

export async function setOfficeActiveCommand(
  id: string,
  isActive: boolean,
): Promise<OfficeLifecycleResult> {
  try {
    return {
      ok: true,
      office: await setOfficeActiveRecord(id, isActive),
    };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Office could not be found.",
      };
    }

    throw error;
  }
}
