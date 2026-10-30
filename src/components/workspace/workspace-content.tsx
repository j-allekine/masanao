import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Pane width owns gutters; the padded inner width owns content presentation. */
export function WorkspaceContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className="workspace-pane min-w-0 flex-1"><div className={cn("workspace-content mx-auto flex w-full max-w-content flex-col gap-6 py-6", className)}>{children}</div></div>;
}

export function WorkspaceCatalogHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="workspace-catalog-header flex min-w-0 flex-col gap-3 border-b pb-5">
    <div className="min-w-0"><h1 className="workspace-page-title font-heading font-heading-1">{title}</h1>{description ? <p className="mt-2 text-body text-muted-foreground">{description}</p> : null}</div>
    {action}
  </div>;
}
