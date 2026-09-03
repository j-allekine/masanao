import "server-only";

import { revalidatePath } from "next/cache";

import { updateUnit } from "../../server";
import type { UnitFormActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeUpdateUnit(
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

  const id = formData.get("id");
  if (typeof id !== "string" || id.trim() === "") {
    return {
      status: "error",
      kind: "not-found",
      error: "The Unit could not be found.",
      fields: {},
    };
  }

  const input = Object.fromEntries(formData.entries());
  delete input.id;

  try {
    const result = await updateUnit(actor, id, input);

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
      kind: "validation",
      error: "The Unit could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
