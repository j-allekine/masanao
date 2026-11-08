"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function ItemsError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="items" retry={retry} />;
}
