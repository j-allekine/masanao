"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function OverviewError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="overview" retry={retry} />;
}
