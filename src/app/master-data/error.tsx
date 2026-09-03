"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function MasterDataError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspaceRouteError
      activeSection="master-data"
      error={error}
      reset={reset}
    />
  );
}
