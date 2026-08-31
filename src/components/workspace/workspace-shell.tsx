"use client";

import { AppSidebar, type AppSidebarUser } from "@/components/workspace/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WorkspaceSectionId } from "@/lib/workspace-navigation";

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
      <SidebarProvider>
        <AppSidebar user={user} activeSection={activeSection} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
