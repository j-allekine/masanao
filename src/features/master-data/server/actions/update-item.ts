import "server-only";

import { revalidatePath } from "next/cache";

import { updateItem } from "../../server";
import type { ItemFormActionState } from "../../types";
import { getCurrentMasterDataActor } from "./current-actor";

export async function executeUpdateItem(
  formData: FormData,
): Promise<ItemFormActionState> {
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
      error: "The Item could not be found.",
      fields: {},
    };
  }

  const input = Object.fromEntries(formData.entries());
  delete input.id;

  try {
    const result = await updateItem(actor, id, input);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/items");
    return { status: "success", item: result.item };
  } catch {
    return {
      status: "error",
      kind: "server",
      error: "The Item could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
