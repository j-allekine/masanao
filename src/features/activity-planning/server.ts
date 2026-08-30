import "server-only";

import { createActivityDesignCommand } from "./server/commands/create-activity-design";
import { listActivityDesigns as listActivityDesignQuery } from "./server/queries/list-activity-designs";

export type {
  ActivityDesignCreateResult,
  ActivityDesignListItem,
} from "./types";

export async function listActivityDesigns() {
  return listActivityDesignQuery();
}

export async function createActivityDesign(input: unknown) {
  return createActivityDesignCommand(input);
}
