"use client"

import type { AppSidebarUser } from "@/app/_components/app-sidebar"
import WorkspacePage from "@/app/_components/workspace-page"

export default function OverviewPage({ user }: { user: AppSidebarUser }) {
  return <WorkspacePage user={user} activeSection="overview" />
}
