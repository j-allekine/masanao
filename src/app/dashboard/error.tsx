"use client";
import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <WorkspaceRouteError activeSection="overview" error={error} reset={reset} />;
}
