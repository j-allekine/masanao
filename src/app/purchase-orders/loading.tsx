import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function PurchaseOrdersLoading() {
  return (
    <WorkspaceRouteLoading activeSection="purchase-orders">
      <WorkspaceTableSkeleton
        columnLabels={[
          "Purchase Order No.",
          "Vendor",
          "Reference",
          "Last updated",
        ]}
      />
    </WorkspaceRouteLoading>
  );
}
