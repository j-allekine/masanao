import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** Shared workspace orientation; features own record identity and actions. */
export default function WorkspaceHeader({ title, description, actions }: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header data-slot="workspace-header" className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="h-8 self-center" aria-hidden="true" />
        <div className="min-w-0">
          <p className="break-words text-heading-3 font-semibold">{title}</p>
          {description ? <p className="break-words text-body-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
