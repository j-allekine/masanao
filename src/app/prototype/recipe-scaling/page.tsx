import { Suspense } from "react";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import RecipeScalingPrototype from "@/components/prototypes/recipe-scaling/recipe-scaling-prototype";

export default function RecipeScalingPrototypePage() {
  return (
    <WorkspaceShell
      user={{ name: "Municipal staff", username: "staff account" }}
      activeSection="activity-designs"
    >
      <Suspense
        fallback={
          <main className="flex min-h-svh items-center justify-center bg-card px-6 text-body-sm text-muted-foreground">
            Loading issuance prototype…
          </main>
        }
      >
        <RecipeScalingPrototype />
      </Suspense>
    </WorkspaceShell>
  );
}
