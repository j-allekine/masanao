import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import WorkspaceShell, { type WorkspaceUser } from "@/components/workspace/workspace-shell";
import {
  getWorkspaceSectionDetails,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation";

const loadingUser: WorkspaceUser = {
  name: "Municipal staff",
  username: "staff account",
};

function DefaultLoadingLayout() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </>
  );
}

export default function WorkspaceRouteLoading({
  activeSection,
  children,
}: {
  activeSection: WorkspaceSectionId;
  children?: React.ReactNode;
}) {
  const section = getWorkspaceSectionDetails(activeSection);

  return (
    <WorkspaceShell user={loadingUser} activeSection={activeSection}>
      <div className="flex min-h-svh flex-col bg-background">
        <header className="flex min-h-16 items-center gap-3 border-b px-4 sm:px-6">
          <SidebarTrigger />
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-xs text-muted-foreground">Masanao municipality</p>
            <p className="truncate text-sm font-medium">{section.label}</p>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
          {children ?? <DefaultLoadingLayout />}
        </div>
      </div>
    </WorkspaceShell>
  );
}
