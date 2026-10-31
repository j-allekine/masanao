"use client";
import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function OverviewError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WorkspaceRouteError activeSection="overview" error={error} retry={retry} />;
}
