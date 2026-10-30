"use client";

import { AppSidebar, type AppSidebarUser } from "@/components/workspace/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WorkspaceSectionId } from "@/lib/workspace-navigation";
import { useSyncExternalStore, type CSSProperties } from "react";

export type WorkspaceUser = AppSidebarUser;

export default function WorkspaceShell({
  user,
  activeSection,
  children,
}: {
  user?: WorkspaceUser;
  activeSection: WorkspaceSectionId;
  children: React.ReactNode;
}) {
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <TooltipProvider>
      <SidebarProvider
        data-shell-client-ready={isHydrated ? "true" : undefined}
        style={{
          "--sidebar-width": "15.5rem",
        } as CSSProperties}
      >
        <a href="#workspace-main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:outline-2 focus:outline-ring">
          Skip to main content
        </a>
        <AppSidebar user={user} activeSection={activeSection} />
        <SidebarInset id="workspace-main" tabIndex={-1} className="min-w-0">{children}</SidebarInset>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}
