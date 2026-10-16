import { Suspense } from "react";

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

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-6">
        <Suspense
          fallback={
            <WorkspaceTableSkeleton
              columnLabels={[
                "Purchase Order No.",
                "Vendor",
                "Reference",
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
      </div>
    </div>
  );
}
