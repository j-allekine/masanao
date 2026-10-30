import { Suspense } from "react";

import { WorkspaceContent } from "@/components/workspace/workspace-content";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

import type {
  PurchaseOrderListItem,
  PurchaseOrderVendorOption,
} from "../types";
import PurchaseOrdersWorkspace from "./purchase-orders-workspace";

export default function PurchaseOrdersContent({
  purchaseOrders,
  vendors,
  canManagePurchaseOrders,
}: {
  purchaseOrders: PurchaseOrderListItem[];
  vendors: PurchaseOrderVendorOption[];
  canManagePurchaseOrders: boolean;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <WorkspaceHeader title="Supply Operations" />

      <WorkspaceContent>
        <Suspense
          fallback={
            <WorkspaceTableSkeleton
              columnLabels={[
                "Purchase Order No.",
                "Vendor",
                "Total delivered",
                "Last updated",
              ]}
            />
          }
        >
          <PurchaseOrdersWorkspace
            purchaseOrders={purchaseOrders}
            vendors={vendors}
            canManagePurchaseOrders={canManagePurchaseOrders}
          />
        </Suspense>
      </WorkspaceContent>
    </div>
  );
}
