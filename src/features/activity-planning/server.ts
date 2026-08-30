import "server-only";

import { createActivityCommand } from "./server/commands/create-activity";
import { createActivityDesignCommand } from "./server/commands/create-activity-design";
import { deleteActivityDesignCommand } from "./server/commands/delete-activity-design";
import { updateActivityDesignCommand } from "./server/commands/update-activity-design";
import { getActivityDesign as getActivityDesignQuery } from "./server/queries/get-activity-design";
import { listActivityDesigns as listActivityDesignQuery } from "./server/queries/list-activity-designs";

export type {
  ActivityCreateResult,
  ActivityDesignDetail,
  ActivityDesignDeleteResult,
  ActivityDesignCreateResult,
  ActivityDesignListItem,
  ActivityDesignUpdateResult,
} from "./types";

export async function listActivityDesigns() {
  return listActivityDesignQuery();
}

export async function createActivityDesign(input: unknown) {
  return createActivityDesignCommand(input);
}

export async function createActivity(activityDesignId: string, input: unknown) {
  return createActivityCommand(activityDesignId, input);
}

export async function getActivityDesign(id: string) {
  return getActivityDesignQuery(id);
}

export async function updateActivityDesign(id: string, input: unknown) {
  return updateActivityDesignCommand(id, input);
}

export async function deleteActivityDesign(id: string) {
  return deleteActivityDesignCommand(id);
}
