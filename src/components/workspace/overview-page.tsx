"use client"

import type { AppSidebarUser } from "@/components/workspace/app-sidebar"
import WorkspacePage from "@/components/workspace/workspace-page"

export default function OverviewPage({ user }: { user: AppSidebarUser }) {
  return <WorkspacePage user={user} activeSection="overview" />
}
