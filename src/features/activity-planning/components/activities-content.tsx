import WorkspaceHeader from "@/components/workspace/workspace-header";

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
    <div className="flex min-h-svh flex-col bg-card">
      <WorkspaceHeader title="Planning" />

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-6">
        <ActivitiesWorkspace
          activities={initialActivities}
          activityDesigns={initialActivityDesigns}
          initialQuery={initialQuery}
        />
      </div>
    </div>
  );
}
