import "server-only";

import type { ActivityDesignDeleteResult } from "../../types";
import { deleteActivityDesignRecord } from "../db/activity-designs";

export async function deleteActivityDesignCommand(
  id: string,
): Promise<ActivityDesignDeleteResult> {
  const result = await deleteActivityDesignRecord(id);

  if (!result) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity Design could not be found.",
    };
  }

  if (!result.deleted) {
    return {
      ok: false,
      kind: "has-activities",
      error:
        "This Activity Design cannot be deleted while it has Activities. Remove its Activities first.",
      activityCount: result.activityCount,
    };
  }

  return { ok: true };
}
