"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function MasterDataError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="master-data" retry={retry} />;
}
