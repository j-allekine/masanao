"use client";

import { RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import WorkspaceShell, { type WorkspaceUser } from "@/components/workspace/workspace-shell";
import {
  getWorkspaceHeaderTitle,
  getWorkspaceSectionDetails,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation";

const errorUser: WorkspaceUser = {
  name: "Workspace unavailable",
  username: "Please try again",
};

export default function WorkspaceRouteError({
  activeSection,
  reset,
  children,
}: {
  activeSection: WorkspaceSectionId;
  error: Error & { digest?: string };
  reset: () => void;
  children?: React.ReactNode;
}) {
  const section = getWorkspaceSectionDetails(activeSection);

  return (
    <WorkspaceShell user={errorUser} activeSection={activeSection}>
      <div className="flex min-h-svh flex-col bg-background">
        <WorkspaceHeader title={getWorkspaceHeaderTitle(activeSection)} />
        <div className="mx-auto flex w-full max-w-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
          {children}
          <Alert variant="destructive" role="alert">
            <AlertTitle>Unable to load {section.label}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
              <span>Try again to reload this workspace.</span>
              <Button type="button" variant="outline" onClick={reset}>
                <RefreshCw data-icon="inline-start" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </WorkspaceShell>
  );
}
