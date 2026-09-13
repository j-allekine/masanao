import "server-only";

import { revalidatePath } from "next/cache";

import { createItem } from "../../server";
import type { ItemFormActionState } from "../../types";
import { getCurrentSupplyOperationsActor } from "./current-actor";

export async function executeCreateItem(
  formData: FormData,
): Promise<ItemFormActionState> {
  const actor = await getCurrentSupplyOperationsActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
      fields: {},
    };
  }

  try {
    const result = await createItem(
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
