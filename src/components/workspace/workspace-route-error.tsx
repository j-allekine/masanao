"use client";

import { RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import WorkspaceHeader from "@/components/workspace/workspace-header";
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
  error: Error & { digest?: string };
  retry: () => void;
  children?: React.ReactNode;
}) {
  const section = getWorkspaceSectionDetails(activeSection);

  return (
    <WorkspaceShell activeSection={activeSection}>
      <div className="flex min-h-svh flex-col bg-card">
        <WorkspaceHeader title={getWorkspaceHeaderTitle(activeSection)} />
        <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
          <h1 className="break-words text-heading-2 font-semibold">Unable to load {section.label}</h1>
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
      </div>
    </WorkspaceShell>
  );
}
