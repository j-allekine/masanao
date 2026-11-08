"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function DashboardError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="overview" retry={retry} />;
}
