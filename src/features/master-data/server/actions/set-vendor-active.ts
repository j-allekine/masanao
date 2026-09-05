import "server-only";

import { revalidatePath } from "next/cache";

import { setVendorActive } from "../../server";
import type { VendorLifecycleActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeSetVendorActive(
  id: unknown,
  isActive: unknown,
): Promise<VendorLifecycleActionState> {
  const actor = await getCurrentUnitActor();

  if (!actor) {
    return {
      status: "error",
      kind: "authentication",
      error: "Authentication required",
    };
  }

  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof isActive !== "boolean"
  ) {
    return {
      status: "error",
      kind: "server",
      error: "The Vendor status request is invalid.",
    };
  }

  try {
    const result = await setVendorActive(actor, id, isActive);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
      };
    }

    revalidatePath("/master-data");
    return { status: "success", vendor: result.vendor };
  } catch {
    return {
      status: "error",
      kind: "server",
      error:
        "The Vendor status could not be changed. Check your connection and try again.",
    };
  }
}
