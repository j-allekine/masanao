import ActivityDesignsWorkspace from "./activity-designs-workspace";
import type { ActivityDesignListItem, ActivityOfficeOption } from "../types";

export default function ActivityDesignsContent({
  offices,
  initialActivityDesigns,
  initialQuery = "",
}: {
  offices: ActivityOfficeOption[];
  initialActivityDesigns: ActivityDesignListItem[];
  initialQuery?: string;
}) {
  return (
    <ActivityDesignsWorkspace
      offices={offices}
      activityDesigns={initialActivityDesigns}
      initialQuery={initialQuery}
    />
  );
}
