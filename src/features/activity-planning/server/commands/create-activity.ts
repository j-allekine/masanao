import "server-only";

import {
  activityFieldErrors,
  activitySchema,
} from "../../schemas/activity";
import type { ActivityCreateResult } from "../../types";
import { createActivityRecord } from "../db/activities";

export async function createActivityCommand(
  activityDesignId: string,
  input: unknown,
): Promise<ActivityCreateResult> {
  const parsedInput = activitySchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Activity fields.",
      fields: activityFieldErrors(parsedInput.error),
    };
  }

  if (typeof activityDesignId !== "string" || activityDesignId.trim() === "") {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity Design could not be found.",
      fields: {},
    };
  }

  const activity = await createActivityRecord(activityDesignId, parsedInput.data);

  if (!activity) {
    return {
      ok: false,
      kind: "not-found",
      error: "The Activity Design could not be found.",
      fields: {},
    };
  }

  return { ok: true, activity };
}
