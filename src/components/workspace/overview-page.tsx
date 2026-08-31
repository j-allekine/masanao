"use client"

import type { AppSidebarUser } from "@/components/workspace/app-sidebar"
import WorkspaceShell from "@/components/workspace/workspace-shell"
import WorkspacePage from "@/components/workspace/workspace-page"

export default function OverviewPage({ user }: { user: AppSidebarUser }) {
  return (
    <WorkspaceShell user={user} activeSection="overview">
      <WorkspacePage user={user} activeSection="overview" />
    </WorkspaceShell>
  )
}
