import "server-only";

import { listActivityWorkspaceRecords } from "../db/activities";

export async function listActivities() {
  return listActivityWorkspaceRecords();
}
