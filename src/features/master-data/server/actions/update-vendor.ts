import "server-only";

import { revalidatePath } from "next/cache";

import { updateVendor } from "../../server";
import type { VendorFormActionState } from "../../types";
import { getCurrentUnitActor } from "./current-actor";

export async function executeUpdateVendor(
  formData: FormData,
): Promise<VendorFormActionState> {
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
      error: "The Vendor could not be found.",
      fields: {},
    };
  }

  const input = Object.fromEntries(formData.entries());
  delete input.id;

  try {
    const result = await updateVendor(actor, id, input);

    if (!result.ok) {
      return {
        status: "error",
        kind: result.kind,
        error: result.error,
        fields: result.fields,
      };
    }

    revalidatePath("/master-data");
    return { status: "success", vendor: result.vendor };
  } catch {
    return {
      status: "error",
      kind: "server",
      error: "The Vendor could not be saved. Check your connection and try again.",
      fields: {},
    };
  }
}
