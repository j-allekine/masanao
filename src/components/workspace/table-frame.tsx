import type { ReactNode } from "react";

import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default function WorkspaceTableFrame({
  caption,
  className,
  children,
  responsive = false,
}: {
  caption: string;
  className?: string;
  children: ReactNode;
  /** One table DOM reflows into labelled compact rows at the inner breakpoint. */
  responsive?: boolean;
}) {
  return (
    <div data-workspace-catalog={responsive ? "" : undefined} className={cn("rounded-xl border bg-card shadow-xs", responsive && "workspace-catalog-frame")}>
      <Table className={cn(responsive && "workspace-catalog-table table-fixed", className)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </Table>
    </div>
  );
}
