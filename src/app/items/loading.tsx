import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function ItemsLoading() {
  return (
    <WorkspaceRouteLoading activeSection="items">
      <WorkspaceTableSkeleton
        columnLabels={["Name", "Category", "Base Unit", "Status"]}
      />
    </WorkspaceRouteLoading>
  );
}
