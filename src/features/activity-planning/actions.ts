"use server";

import { executeCreateActivityDesign } from "./server/actions/create-activity-design";
import type { ActivityDesignActionState } from "./types";

export async function createActivityDesignAction(
  formData: FormData,
): Promise<ActivityDesignActionState> {
  return executeCreateActivityDesign(formData);
}
