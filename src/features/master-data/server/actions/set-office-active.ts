import "server-only";

import { revalidatePath } from "next/cache";

import { setOfficeActive } from "../../server";
import type { OfficeLifecycleActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeSetOfficeActive(
  id: unknown,
  isActive: unknown,
): Promise<OfficeLifecycleActionState> {
  const actor = await getCurrentUnitActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof isActive !== "boolean"
  ) {
    return {
      status: "error",
      kind: "server",
      error: "The Office status request is invalid.",
    };
  }

  try {
    const result = await setOfficeActive(actor, id, isActive);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/master-data");
    return { status: "success", office: result.office };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Office status could not be changed. Check your connection and try again.",
    };
  }
}
