import "server-only";

import {
  activityFieldErrors,
  activityUpdateSchema,
  unavailableActivityOffice,
} from "../../schemas/activity";
import type { ActivityUpdateResult } from "../../types";
import { updateActivityRecord } from "../db/activities";

export async function updateActivityCommand(
  activityDesignId: string,
  activityId: string,
  input: unknown,
): Promise<ActivityUpdateResult> {
  const parsedInput = activityUpdateSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Activity fields.",
      fields: activityFieldErrors(parsedInput.error),
    };
  }

  if (
    typeof activityDesignId !== "string" ||
    activityDesignId.trim() === "" ||
    typeof activityId !== "string" ||
    activityId.trim() === ""
  ) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity could not be found.",
      fields: {},
    };
  }

  const activity = await updateActivityRecord(
    activityDesignId,
    activityId,
    parsedInput.data,
  );

  if (activity === "invalid-office") {
    return unavailableActivityOffice;
  }

  if (!activity) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity could not be found.",
      fields: {},
    };
  }

  return { ok: true, activity };
}
