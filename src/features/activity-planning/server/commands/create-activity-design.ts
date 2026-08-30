import "server-only";

import {
  activityDesignFieldErrors,
  activityDesignSchema,
} from "../../schemas/activity-design";
import type { ActivityDesignCreateResult } from "../../types";
import {
  createActivityDesignRecord,
  isUniqueConstraintViolation,
} from "../db/activity-designs";

export async function createActivityDesignCommand(
  input: unknown,
): Promise<ActivityDesignCreateResult> {
  const parsedInput = activityDesignSchema.safeParse(input);

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
      activityDesign: await createActivityDesignRecord(parsedInput.data),
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

    throw error;
  }
}
