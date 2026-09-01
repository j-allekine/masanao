import Link from "next/link";
import { ClipboardList } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { AppSidebarUser } from "@/components/workspace/app-sidebar";
import {
  getWorkspaceSectionDetails,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation";

type WorkspacePageProps = {
  user: AppSidebarUser;
  activeSection: WorkspaceSectionId;
};

export default function WorkspacePage({ user, activeSection }: WorkspacePageProps) {
  const section = getWorkspaceSectionDetails(activeSection);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex min-h-16 items-center gap-3 border-b px-4 sm:px-6">
        <SidebarTrigger />
        <div className="min-w-0 border-l pl-3">
          <p className="truncate text-xs text-muted-foreground">Masanao municipality</p>
          <p className="truncate text-sm font-medium">{section.label}</p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
        <section aria-labelledby="workspace-page-title" className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            Operations overview
          </p>
          <h1
            id="workspace-page-title"
            className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Welcome, {user.name}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Choose a workspace to continue planning municipal kitchen activities.
          </p>
        </section>

        <Empty className="min-h-64 rounded-lg border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Activity planning is ready.</EmptyTitle>
            <EmptyDescription>
              Activity Designs is the current operational workspace. More overview
              information will appear when supported data is available.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link href="/activity-designs" />}>
              Open Activity Designs
            </Button>
          </EmptyContent>
        </Empty>

        <p className="text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.username}</span>.
        </p>
      </div>
    </div>
  );
}
