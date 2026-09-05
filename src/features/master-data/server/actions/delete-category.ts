import "server-only";

import { revalidatePath } from "next/cache";

import { deleteCategory } from "../../server";
import type { CategoryDeleteActionState } from "../../types";
import { getCurrentMasterDataActor } from "./current-actor";

export async function executeDeleteCategory(
  id: unknown,
): Promise<CategoryDeleteActionState> {
  const actor = await getCurrentMasterDataActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (typeof id !== "string" || !id.trim()) {
    return {
      status: "error",
      kind: "not-found",
      error: "The Category could not be found.",
    };
  }

  try {
    const result = await deleteCategory(actor, id);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/master-data");
    return { status: "success" };
  } catch {
    return {
      status: "error",
      kind: "server",
      error: "The Category could not be deleted. Check your connection and try again.",
    };
  }
}
