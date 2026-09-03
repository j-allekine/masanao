import "server-only";

import { revalidatePath } from "next/cache";

import { deleteUnit } from "../../server";
import type { UnitDeleteActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeDeleteUnit(
  id: string,
): Promise<UnitDeleteActionState> {
  const actor = await getCurrentUnitActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (!id.trim()) {
    return {
      status: "error",
      kind: "not-found",
      error: "The Unit could not be found.",
    };
  }

  try {
    const result = await deleteUnit(actor, id);

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
      error: "The Unit could not be deleted. Check your connection and try again.",
    };
  }
}
