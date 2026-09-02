import { PlanningSectionMenu } from "@/features/activity-planning/ui";
import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function ActivitiesLoading() {
  return (
    <WorkspaceRouteLoading activeSection="activity-designs">
      <PlanningSectionMenu activeSection="activities" />
      <WorkspaceTableSkeleton
        columnLabels={[
          "Activity name",
          "Activity Design title",
          "Meal Schedule count",
          "Actions",
        ]}
      />
    </WorkspaceRouteLoading>
  );
}
