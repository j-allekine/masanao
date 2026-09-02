import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { normalizeActivityFormInput } from "../../schemas/activity";
import { updateActivity } from "../../server";
import type { ActivityUpdateActionState } from "../../types";

export async function executeUpdateActivity(
  formData: FormData,
): Promise<ActivityUpdateActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      status: "error",
      error: "Authentication required",
      fields: {},
    };
  }

  const activityDesignId = formData.get("activityDesignId");
  const activityId = formData.get("activityId");

  if (
    typeof activityDesignId !== "string" ||
    activityDesignId.trim() === "" ||
    typeof activityId !== "string" ||
    activityId.trim() === ""
  ) {
    return {
      status: "error",
      error: "The Activity could not be found.",
      fields: {},
    };
  }

  try {
    const input = normalizeActivityFormInput(Object.fromEntries(formData.entries()));
    delete input.activityDesignId;
    delete input.activityId;

    const result = await updateActivity(activityDesignId, activityId, input);

    if (!result.ok) {
      return {
        status: "error",
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath(`/activity-designs/${activityDesignId}`);
    revalidatePath("/activity-designs");

    return { status: "success", activity: result.activity };
  } catch {
    return {
      status: "error",
      error:
        "The Activity could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
