import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { normalizeActivityFormInput } from "../../schemas/activity";
import { createActivity } from "../../server";
import type { ActivityActionState } from "../../types";

export async function executeCreateActivity(
  formData: FormData,
): Promise<ActivityActionState> {
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
  if (
    typeof activityDesignId !== "string" ||
    activityDesignId.trim() === ""
  ) {
    return {
      status: "error",
      error: "Please select an Activity Design.",
      fields: {
        activityDesignId: ["Activity Design is required."],
      },
    };
  }

  try {
    const input = normalizeActivityFormInput(Object.fromEntries(formData.entries()));
    delete input.activityDesignId;

    const result = await createActivity(activityDesignId, input);

    if (!result.ok) {
      return {
        status: "error",
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/activity-designs");
    revalidatePath("/activities");

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
