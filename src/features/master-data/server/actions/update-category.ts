import "server-only";

import { revalidatePath } from "next/cache";

import { updateCategory } from "../../server";
import type { CategoryFormActionState } from "../../types";
import { getCurrentMasterDataActor } from "./current-actor";

export async function executeUpdateCategory(
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

  const id = formData.get("id");
  if (typeof id !== "string" || id.trim() === "") {
    return {
      status: "error",
      kind: "not-found",
      error: "The Category could not be found.",
      fields: {},
    };
  }

  const input = Object.fromEntries(formData.entries());
  delete input.id;

  try {
    const result = await updateCategory(actor, id, input);

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
