"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function MasterDataError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <WorkspaceRouteError
      activeSection="master-data"
      error={error}
      retry={retry}
    />
  );
}
