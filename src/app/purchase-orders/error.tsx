"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function PurchaseOrdersError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <WorkspaceRouteError
      activeSection="purchase-orders"
      error={error}
      retry={retry}
    />
  );
}
