import "server-only";

import { revalidatePath } from "next/cache";

import { createUnit } from "../../server";
import type { UnitFormActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeCreateUnit(
  formData: FormData,
): Promise<UnitFormActionState> {
  const actor = await getCurrentUnitActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
      fields: {},
    };
  }

  try {
    const result = await createUnit(
      actor,
      Object.fromEntries(formData.entries()),
    );

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/master-data");
    return { status: "success", unit: result.unit };
  } catch {
    return {
      status: "error",
      kind: "server",
      error: "The Unit could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
