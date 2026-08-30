import "server-only";

import { listActivityDesignRecords } from "../db/activity-designs";

export async function listActivityDesigns() {
  return listActivityDesignRecords();
}
