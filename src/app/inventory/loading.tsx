import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

export default function InventoryLoading() {
  return <WorkspaceRouteLoading activeSection="inventory"><WorkspaceTableSkeleton columnLabels={["Item", "Category", "On hand", "Reorder level", "Stock status"]} /></WorkspaceRouteLoading>;
}
