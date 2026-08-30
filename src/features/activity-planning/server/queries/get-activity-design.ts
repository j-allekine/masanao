import "server-only";

import { getActivityDesignRecord } from "../db/activities";

export async function getActivityDesign(id: string) {
  return getActivityDesignRecord(id);
}
