import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function ActivityDesignsLoading() {
  return (
    <WorkspaceRouteLoading activeSection="activity-designs">
      <WorkspaceTableSkeleton
        columnLabels={[
          "Design No.",
          "Activity Design",
          "Fiscal Year",
          "Activities",
          "Actions",
        ]}
      />
    </WorkspaceRouteLoading>
  );
}
