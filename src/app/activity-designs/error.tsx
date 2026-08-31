"use client";

import { PlanningSectionMenu } from "@/features/activity-planning/ui";
import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function ActivityDesignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspaceRouteError
      activeSection="activity-designs"
      error={error}
      reset={reset}
    >
      <PlanningSectionMenu />
    </WorkspaceRouteError>
  );
}
