"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function PurchaseOrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspaceRouteError
      activeSection="purchase-orders"
      error={error}
      reset={reset}
    />
  );
}
