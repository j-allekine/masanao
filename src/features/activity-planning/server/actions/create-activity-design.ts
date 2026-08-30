import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { createActivityDesign } from "../../server";
import type { ActivityDesignActionState } from "../../types";

export async function executeCreateActivityDesign(
  formData: FormData,
): Promise<ActivityDesignActionState> {
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

  try {
    const result = await createActivityDesign(
      Object.fromEntries(formData.entries()),
    );

    if (!result.ok) {
      return {
        status: "error",
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/activity-designs");

    return { status: "success" };
  } catch {
    return {
      status: "error",
      error:
        "The Activity Design could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
