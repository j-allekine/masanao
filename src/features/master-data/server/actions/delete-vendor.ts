import "server-only";

import { revalidatePath } from "next/cache";

import { deleteVendor } from "../../server";
import type { VendorDeleteActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeDeleteVendor(
  id: unknown,
): Promise<VendorDeleteActionState> {
  const actor = await getCurrentUnitActor();

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
      error: "The Vendor could not be found.",
    };
  }

  try {
    const result = await deleteVendor(actor, id);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/master-data");
    return { status: "success" };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Vendor could not be deleted. Check your connection and try again.",
    };
  }
}
