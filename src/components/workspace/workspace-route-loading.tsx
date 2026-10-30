import WorkspaceHeader from "@/components/workspace/workspace-header";
import { Skeleton } from "@/components/ui/skeleton";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import {
  getWorkspaceHeaderTitle,
  getWorkspaceSectionDetails,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation";

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
    <WorkspaceShell activeSection={activeSection}>
      <div className="flex min-h-svh flex-col bg-card">
        <WorkspaceHeader title={getWorkspaceHeaderTitle(activeSection)} />
        <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
          <h1 className="break-words text-heading-2 font-semibold">Loading {getWorkspaceSectionDetails(activeSection).label}</h1>
          {children ?? <DefaultLoadingLayout />}
        </div>
      </div>
    </WorkspaceShell>
  );
}
