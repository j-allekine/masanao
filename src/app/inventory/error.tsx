"use client";
import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function InventoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <WorkspaceRouteError activeSection="inventory" error={error} reset={reset} />;
}
