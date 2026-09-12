import "server-only";

import { revalidatePath } from "next/cache";

import { deleteItem } from "../../server";
import type { ItemDeleteActionState } from "../../types";
import { getCurrentMasterDataActor } from "./current-actor";

export async function executeDeleteItem(
  id: unknown,
): Promise<ItemDeleteActionState> {
  const actor = await getCurrentMasterDataActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (typeof id !== "string" || !id.trim()) {
    return {
      status: "error",
      kind: "not-found",
      error: "The Item could not be found.",
    };
  }

  try {
    const result = await deleteItem(actor, id);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/items");
    return { status: "success" };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Item could not be deleted. Check your connection and try again.",
    };
  }
}
