import "server-only";

import { revalidatePath } from "next/cache";

import { updateOffice } from "../../server";
import type { OfficeFormActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeUpdateOffice(
  formData: FormData,
): Promise<OfficeFormActionState> {
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
      error: "The Office could not be found.",
      fields: {},
    };
  }

  const input = Object.fromEntries(formData.entries());
  delete input.id;

  try {
    const result = await updateOffice(actor, id, input);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/master-data");
    return { status: "success", office: result.office };
  } catch {
    return {
      status: "error",
      kind: "server",
      error: "The Office could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
