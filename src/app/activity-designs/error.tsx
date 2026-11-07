"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function ActivityDesignsError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="activity-designs" retry={retry} />;
}
