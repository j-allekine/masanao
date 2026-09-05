import "server-only";

import { revalidatePath } from "next/cache";

import { createCategory } from "../../server";
import type { CategoryFormActionState } from "../../types";
import { getCurrentMasterDataActor } from "./current-actor";

export async function executeCreateCategory(
  formData: FormData,
): Promise<CategoryFormActionState> {
  const actor = await getCurrentMasterDataActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
      fields: {},
    };
  }

  try {
    const result = await createCategory(
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
    return { status: "success", category: result.category };
  } catch {
    return {
      status: "error",
      kind: "server",
      error: "The Category could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
