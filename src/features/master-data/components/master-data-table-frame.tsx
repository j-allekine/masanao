import type { ReactNode } from "react";

import { Table } from "@/components/ui/table";

export default function MasterDataTableFrame({
  caption,
  className,
  children,
}: {
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <Table className={className}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </Table>
    </div>
  );
}
