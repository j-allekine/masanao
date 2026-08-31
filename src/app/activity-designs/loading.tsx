import { PlanningSectionMenu } from "@/features/activity-planning/ui";
import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function ActivityDesignsLoading() {
  return (
    <WorkspaceRouteLoading activeSection="activity-designs">
      <PlanningSectionMenu />
      <WorkspaceTableSkeleton
        columnLabels={["Design No.", "Title", "Office", "Fiscal Year", "Activities", "Actions"]}
      />
    </WorkspaceRouteLoading>
  );
}
