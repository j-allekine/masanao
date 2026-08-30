import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import WorkspacePage from "@/app/_components/workspace-page"
import { auth } from "@/server/auth"
import { getWorkspaceSection } from "@/app/_lib/workspace-navigation"

export default async function WorkspaceSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section: rawSection } = await params
  const activeSection = getWorkspaceSection(rawSection)

  if (!activeSection || activeSection === "overview") {
    notFound()
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/")
  }

  return (
    <WorkspacePage
      activeSection={activeSection}
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
    />
  )
}
