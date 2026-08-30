import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { updateActivityDesign } from "../../server";
import type { ActivityDesignUpdateActionState } from "../../types";

export async function executeUpdateActivityDesign(
  formData: FormData,
): Promise<ActivityDesignUpdateActionState> {
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

  const id = formData.get("id");
  if (typeof id !== "string" || id.trim() === "") {
    return {
      status: "error",
      error: "The Activity Design could not be found.",
      fields: {},
    };
  }

  try {
    const input = Object.fromEntries(formData.entries());
    delete input.id;

    const result = await updateActivityDesign(id, input);

    if (!result.ok) {
      return {
        status: "error",
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/activity-designs");

    return { status: "success", activityDesign: result.activityDesign };
  } catch {
    return {
      status: "error",
      error:
        "The Activity Design could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
