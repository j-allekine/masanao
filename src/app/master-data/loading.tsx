import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function MasterDataLoading() {
  return (
    <WorkspaceRouteLoading activeSection="master-data">
      <WorkspaceTableSkeleton
        columnLabels={["Name", "Abbreviation", "Status"]}
      />
    </WorkspaceRouteLoading>
  );
}
