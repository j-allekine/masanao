"use client";

import { AppSidebar, type AppSidebarUser } from "@/components/workspace/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WorkspaceSectionId } from "@/lib/workspace-navigation";
import type { CSSProperties } from "react";

export type WorkspaceUser = AppSidebarUser;

export default function WorkspaceShell({
  user,
  activeSection,
  children,
}: {
  user: WorkspaceUser;
  activeSection: WorkspaceSectionId;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={{
          "--sidebar-width": "15.5rem",
        } as CSSProperties}
      >
        <AppSidebar user={user} activeSection={activeSection} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}
