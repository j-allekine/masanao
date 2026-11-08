"use client";

import WorkspaceRouteError from "@/components/workspace/workspace-route-error";

export default function RecipesError({ retry }: { retry: () => void }) {
  return <WorkspaceRouteError activeSection="recipes" retry={retry} />;
}
