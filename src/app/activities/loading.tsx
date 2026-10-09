import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function ActivitiesLoading() {
  return (
    <WorkspaceRouteLoading activeSection="activity-designs">
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
