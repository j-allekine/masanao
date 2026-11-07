import { Suspense } from "react";

import WorkspaceLayout, { WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";
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
    <Suspense
      fallback={
        <WorkspaceLayout
          workspaceTitle="Supply Operations"
          task={<WorkspaceTaskHeader><h1 className="text-heading-3 font-semibold">Purchase Orders</h1></WorkspaceTaskHeader>}
        >
          <div className="mx-auto w-full max-w-content px-4 py-6 sm:px-6">
            <WorkspaceTableSkeleton
              columnLabels={["Purchase Order No.", "Vendor", "Total delivered", "Last updated"]}
            />
          </div>
        </WorkspaceLayout>
      }
    >
      <PurchaseOrdersWorkspace
        purchaseOrders={purchaseOrders}
        vendors={vendors}
        canManagePurchaseOrders={canManagePurchaseOrders}
      />
    </Suspense>
  );
}
