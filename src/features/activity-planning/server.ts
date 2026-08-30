import "server-only";

import { createActivityDesignCommand } from "./server/commands/create-activity-design";
import { deleteActivityDesignCommand } from "./server/commands/delete-activity-design";
import { updateActivityDesignCommand } from "./server/commands/update-activity-design";
import { listActivityDesigns as listActivityDesignQuery } from "./server/queries/list-activity-designs";

export type {
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

export async function updateActivityDesign(id: string, input: unknown) {
  return updateActivityDesignCommand(id, input);
}

export async function deleteActivityDesign(id: string) {
  return deleteActivityDesignCommand(id);
}
