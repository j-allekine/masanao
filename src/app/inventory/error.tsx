"use client";
import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function InventoryError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WorkspaceRouteError activeSection="inventory" error={error} retry={retry} />;
}
