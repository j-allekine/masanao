"use client"

import { AppSidebar, type AppSidebarUser } from "@/components/workspace/app-sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  getWorkspaceSectionDetails,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation"

type WorkspacePageProps = {
  user: AppSidebarUser
  activeSection: WorkspaceSectionId
}

function PlaceholderMetric({ index }: { index: number }) {
  return (
    <section
      aria-label={"Placeholder summary " + (index + 1)}
      className="flex min-h-32 flex-col justify-between rounded-lg border border-dashed bg-card/60 p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Summary value
        </p>
        <span className="size-2 rounded-full bg-primary/40" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </section>
  )
}

export default function WorkspacePage({ user, activeSection }: WorkspacePageProps) {
  const section = getWorkspaceSectionDetails(activeSection)

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} activeSection={activeSection} />
        <SidebarInset>
          <div className="flex min-h-svh flex-col bg-background">
            <header className="flex min-h-16 items-center gap-3 border-b px-4 sm:px-6">
              <SidebarTrigger />
              <div className="min-w-0 border-l pl-3">
                <p className="truncate text-xs text-muted-foreground">Masanao municipality</p>
                <p className="truncate text-sm font-medium">{section.label}</p>
              </div>
            </header>

            <main className="mx-auto flex w-full max-w-masanao-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
              <section aria-labelledby="workspace-page-title" className="max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                  Workspace placeholder
                </p>
                <h1
                  id="workspace-page-title"
                  className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  {section.label}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  This page is ready for its data model. Values, actions, and records will be added here.
                </p>
              </section>

              <section aria-label="Placeholder summary values" className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <PlaceholderMetric key={index} index={index} />
                ))}
              </section>

              <section
                aria-labelledby="placeholder-content-title"
                className="flex min-h-64 flex-col gap-5 rounded-lg border border-dashed bg-card/40 p-5 sm:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-2">
                    <h2 id="placeholder-content-title" className="text-sm font-semibold">
                      Page content
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      Placeholder values and actions will appear in this area.
                    </p>
                  </div>
                  <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
                </div>
                <div className="flex flex-1 flex-col gap-3 pt-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </section>

              <p className="text-xs text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{user.username}</span>.
              </p>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
