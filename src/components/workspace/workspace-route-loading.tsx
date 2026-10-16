import WorkspaceHeader from "@/components/workspace/workspace-header";
import { Skeleton } from "@/components/ui/skeleton";
import WorkspaceShell, { type WorkspaceUser } from "@/components/workspace/workspace-shell";
import {
  getWorkspaceHeaderTitle,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation";

const loadingUser: WorkspaceUser = {
  name: "Loading workspace",
  username: "Please wait",
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

  return (
    <WorkspaceShell user={loadingUser} activeSection={activeSection}>
      <div className="flex min-h-svh flex-col bg-background">
        <WorkspaceHeader title={getWorkspaceHeaderTitle(activeSection)} />
        <div className="mx-auto flex w-full max-w-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
          {children ?? <DefaultLoadingLayout />}
        </div>
      </div>
    </WorkspaceShell>
  );
}
