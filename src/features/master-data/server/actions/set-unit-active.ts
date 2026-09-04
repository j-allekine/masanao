import "server-only";

import { revalidatePath } from "next/cache";

import { setUnitActive } from "../../server";
import type { UnitLifecycleActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeSetUnitActive(
  id: unknown,
  active: unknown,
): Promise<UnitLifecycleActionState> {
  const actor = await getCurrentUnitActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (typeof id !== "string" || !id.trim() || typeof active !== "boolean") {
    return {
      status: "error",
      kind: "server",
      error: "The Unit status request is invalid.",
    };
  }

  try {
    const result = await setUnitActive(actor, id, active);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/master-data");
    return { status: "success", unit: result.unit };
  } catch {
    return {
      status: "error",
      kind: "server",
      error: "The Unit status could not be changed. Check your connection and try again.",
    };
  }
}
