import ActivitiesWorkspace from "./activities-workspace";
import type {
  ActivityDesignListItem,
  ActivityWorkspaceListItem,
} from "../types";

export default function ActivitiesContent({
  initialActivities,
  initialActivityDesigns,
  initialQuery = "",
}: {
  initialActivities: ActivityWorkspaceListItem[];
  initialActivityDesigns: ActivityDesignListItem[];
  initialQuery?: string;
}) {
  return (
    <ActivitiesWorkspace
      activities={initialActivities}
      activityDesigns={initialActivityDesigns}
      initialQuery={initialQuery}
    />
  );
}
