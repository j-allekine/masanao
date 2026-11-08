"use client";

import { RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import WorkspaceLayout from "@/components/workspace/workspace-layout";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import {
  getWorkspaceHeaderTitle,
  getWorkspaceSectionDetails,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation";

export default function WorkspaceRouteError({
  activeSection,
  retry,
  children,
}: {
  activeSection: WorkspaceSectionId;
  retry: () => void;
  children?: React.ReactNode;
}) {
  const section = getWorkspaceSectionDetails(activeSection);

  return (
    <WorkspaceShell activeSection={activeSection}>
      <WorkspaceLayout workspaceTitle={getWorkspaceHeaderTitle(activeSection)}>
        <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
          {children}
          <Alert variant="destructive" role="alert">
            <AlertTitle>Unable to load {section.label}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
              <span>Try again to reload this workspace.</span>
              <Button type="button" variant="outline" onClick={retry}>
                <RefreshCw data-icon="inline-start" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </WorkspaceLayout>
    </WorkspaceShell>
  );
}
