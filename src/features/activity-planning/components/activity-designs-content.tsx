import WorkspaceHeader from "@/components/workspace/workspace-header";
import { WorkspaceContent } from "@/components/workspace/workspace-content";

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
    <div className="flex min-h-svh flex-col bg-card">
      <WorkspaceHeader title="Planning" />

      <WorkspaceContent>
        <ActivityDesignsWorkspace
          activityDesigns={initialActivityDesigns}
          initialQuery={initialQuery}
        />
      </WorkspaceContent>
    </div>
  );
}
