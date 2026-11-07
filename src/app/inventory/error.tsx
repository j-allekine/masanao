"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function InventoryError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="inventory" retry={retry} />;
}
