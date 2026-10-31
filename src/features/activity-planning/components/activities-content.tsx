import { WorkspaceContent } from "@/components/workspace/workspace-content";
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

      <WorkspaceContent>
        <ActivitiesWorkspace
          activities={initialActivities}
          activityDesigns={initialActivityDesigns}
          initialQuery={initialQuery}
        />
      </WorkspaceContent>
    </div>
  );
}
