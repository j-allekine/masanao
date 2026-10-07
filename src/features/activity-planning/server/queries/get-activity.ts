import "server-only";

import { getActivityRecord } from "../db/activities";

export async function getActivity(activityDesignId: string, activityId: string) {
  return getActivityRecord(activityDesignId, activityId);
}
