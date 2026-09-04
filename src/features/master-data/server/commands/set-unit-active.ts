import "server-only";

import type { UnitLifecycleResult } from "../../types";
import { isRecordNotFound, setUnitActiveRecord } from "../db/units";

export async function setUnitActiveCommand(
  id: string,
  active: boolean,
): Promise<UnitLifecycleResult> {
  try {
    return { ok: true, unit: await setUnitActiveRecord(id, active) };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Unit could not be found.",
      };
    }

    throw error;
  }
}
