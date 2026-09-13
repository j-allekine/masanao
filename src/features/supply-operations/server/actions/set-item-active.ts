import "server-only";

import { revalidatePath } from "next/cache";

import { setItemActive } from "../../server";
import type { ItemLifecycleActionState } from "../../types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeSetItemActive(
  id: unknown,
  isActive: unknown,
): Promise<ItemLifecycleActionState> {
  const actor = await getCurrentSupplyOperationsActor();

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
      error: "The Item status request is invalid.",
    };
  }

  try {
    const result = await setItemActive(actor, id, isActive);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/items");
    return { status: "success", item: result.item };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Item status could not be changed. Check your connection and try again.",
    };
  }
}
