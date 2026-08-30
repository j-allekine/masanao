"use client"

import type { AppSidebarUser } from "@/components/app-sidebar"
import WorkspacePage from "@/components/workspace-page"

export default function OverviewPage({ user }: { user: AppSidebarUser }) {
  return <WorkspacePage user={user} activeSection="overview" />
}
