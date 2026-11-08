"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function PurchaseOrdersError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="purchase-orders" retry={retry} />;
}
