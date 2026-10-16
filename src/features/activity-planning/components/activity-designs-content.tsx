import WorkspaceHeader from "@/components/workspace/workspace-header";

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

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-6">
        <ActivityDesignsWorkspace
          activityDesigns={initialActivityDesigns}
          initialQuery={initialQuery}
        />
      </div>
    </div>
  );
}
