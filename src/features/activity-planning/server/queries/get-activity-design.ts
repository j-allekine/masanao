import "server-only";

import { getActivityDesignRecord } from "../db/activity-designs";

export async function getActivityDesign(id: string) {
  return getActivityDesignRecord(id);
}
