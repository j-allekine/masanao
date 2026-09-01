"use client";

import { RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import WorkspaceShell, { type WorkspaceUser } from "@/components/workspace/workspace-shell";
import {
  getWorkspaceSectionDetails,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation";

const errorUser: WorkspaceUser = {
  name: "Municipal staff",
  username: "staff account",
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
        <header className="flex min-h-16 items-center gap-3 border-b px-4 sm:px-6">
          <SidebarTrigger />
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-label text-muted-foreground">Masanao municipality</p>
            <p className="truncate text-body-sm font-medium">{section.label}</p>
          </div>
        </header>
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
