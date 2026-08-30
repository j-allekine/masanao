import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { deleteActivity } from "../../server";
import type { ActivityDeleteActionState } from "../../types";

export async function executeDeleteActivity(
  activityDesignId: string,
  activityId: string,
): Promise<ActivityDeleteActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { status: "error", error: "Authentication required" };
  }

  if (
    typeof activityDesignId !== "string" ||
    activityDesignId.trim() === "" ||
    typeof activityId !== "string" ||
    activityId.trim() === ""
  ) {
    return { status: "error", error: "The Activity could not be found." };
  }

  try {
    const result = await deleteActivity(activityDesignId, activityId);

    if (!result.ok) {
      return { status: "error", error: result.error };
    }

    revalidatePath(`/activity-designs/${activityDesignId}`);
    revalidatePath("/activity-designs");

    return { status: "success" };
  } catch {
    return {
      status: "error",
      error:
        "The Activity could not be deleted. Check your connection and try again.",
    };
  }
}
