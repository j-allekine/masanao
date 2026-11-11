import ActivitiesWorkspace from "./activities-workspace";
import type {
  ActivityDesignListItem,
  ActivityWorkspaceListItem,
  ActivityOfficeOption,
} from "../types";

export default function ActivitiesContent({
  offices,
  initialActivities,
  initialActivityDesigns,
  initialQuery = "",
}: {
  offices: ActivityOfficeOption[];
  initialActivities: ActivityWorkspaceListItem[];
  initialActivityDesigns: ActivityDesignListItem[];
  initialQuery?: string;
}) {
  return (
    <ActivitiesWorkspace
      offices={offices}
      activities={initialActivities}
      activityDesigns={initialActivityDesigns}
      initialQuery={initialQuery}
    />
  );
}
