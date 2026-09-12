"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function ItemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspaceRouteError
      activeSection="items"
      error={error}
      reset={reset}
    />
  );
}
