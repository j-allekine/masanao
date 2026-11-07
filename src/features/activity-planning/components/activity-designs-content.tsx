import ActivityDesignsWorkspace from "./activity-designs-workspace";
import type { ActivityDesignListItem } from "../types";

export default function ActivityDesignsContent({
  initialActivityDesigns,
  initialQuery = "",
}: {
  initialActivityDesigns: ActivityDesignListItem[];
  initialQuery?: string;
}) {
  return (
    <ActivityDesignsWorkspace
      activityDesigns={initialActivityDesigns}
      initialQuery={initialQuery}
    />
  );
}
