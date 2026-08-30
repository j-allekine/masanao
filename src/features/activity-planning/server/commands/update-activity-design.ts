import "server-only";

import {
  activityDesignFieldErrors,
  activityDesignUpdateSchema,
} from "../../schemas/activity-design";
import type { ActivityDesignUpdateResult } from "../../types";
import {
  isRecordNotFound,
  isUniqueConstraintViolation,
  updateActivityDesignRecord,
} from "../db/activity-designs";

export async function updateActivityDesignCommand(
  id: string,
  input: unknown,
): Promise<ActivityDesignUpdateResult> {
  const parsedInput = activityDesignUpdateSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      kind: "validation",
      error: "Please correct the highlighted Activity Design fields.",
      fields: activityDesignFieldErrors(parsedInput.error),
    };
  }

  try {
    return {
      ok: true,
      activityDesign: await updateActivityDesignRecord(id, parsedInput.data),
    };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return {
        ok: false,
        kind: "duplicate",
        error: "An Activity Design with that number already exists.",
        fields: {
          activityDesignNo: [
            "An Activity Design with that number already exists.",
          ],
        },
      };
    }

    if (isRecordNotFound(error)) {
      return {
        ok: false,
        kind: "not-found",
        error: "The Activity Design could not be found.",
        fields: {},
      };
    }

    throw error;
  }
}
