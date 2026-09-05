import "server-only";

import { revalidatePath } from "next/cache";

import { createOffice } from "../../server";
import type { OfficeFormActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeCreateOffice(
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

  try {
    const result = await createOffice(
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
