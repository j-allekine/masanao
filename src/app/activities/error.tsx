"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function ActivitiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <WorkspaceRouteError activeSection="activity-designs" error={error} reset={reset} />;
}
