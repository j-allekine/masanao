import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/server/auth";

import { deleteActivityDesign } from "../../server";
import type { ActivityDesignDeleteActionState } from "../../types";

export async function executeDeleteActivityDesign(
  id: string,
): Promise<ActivityDesignDeleteActionState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { status: "error", error: "Authentication required" };
  }

  if (typeof id !== "string" || id.trim() === "") {
    return {
      status: "error",
      error: "The Activity Design could not be found.",
    };
  }

  try {
    const result = await deleteActivityDesign(id);

    if (!result.ok) {
      return { status: "error", error: result.error };
    }

    revalidatePath("/activity-designs");

    return { status: "success" };
  } catch {
    return {
      status: "error",
      error:
        "The Activity Design could not be deleted. Check your connection and try again.",
    };
  }
}
