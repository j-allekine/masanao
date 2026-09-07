import "server-only";

import { revalidatePath } from "next/cache";

import { setCategoryActive } from "../../server";
import type { CategoryLifecycleActionState } from "../../types";
import { getCurrentMasterDataActor } from "./current-actor";

export async function executeSetCategoryActive(
  id: unknown,
  isActive: unknown,
): Promise<CategoryLifecycleActionState> {
  const actor = await getCurrentMasterDataActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (typeof id !== "string" || !id.trim() || typeof isActive !== "boolean") {
    return {
      status: "error",
      kind: "server",
      error: "The Category status request is invalid.",
    };
  }

  try {
    const result = await setCategoryActive(actor, id, isActive);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/master-data");
    return { status: "success", category: result.category };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Category status could not be changed. Check your connection and try again.",
    };
  }
}
