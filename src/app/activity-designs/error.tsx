"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function ActivityDesignsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <WorkspaceRouteError activeSection="activity-designs" error={error} retry={retry} />;
}
