import { PlanningSectionMenu } from "@/features/activity-planning/ui";
import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function ActivityDesignsLoading() {
  return (
    <WorkspaceRouteLoading activeSection="activity-designs">
      <PlanningSectionMenu />
      <WorkspaceTableSkeleton
        columnLabels={[
          "Selection",
          "Design No.",
          "Activity Design",
          "Fiscal Year",
          "Activities",
          "Meal Schedules",
          "Actions",
        ]}
      />
    </WorkspaceRouteLoading>
  );
}
