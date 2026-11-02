"use client";

import type { ComponentProps } from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Read-only inspectors keep Close above one scroller for identity and contents. */
export function InspectorDialogContent({ children, className, style, ...props }: Omit<ComponentProps<typeof DialogContent>, "showCloseButton">) {
  return (
    <DialogContent {...props} style={{ ...style, scrollbarGutter: "auto" }} showCloseButton className={cn("flex flex-col gap-0 overflow-hidden p-0 pt-14", className)}>
      <div data-inspector-scroll style={{ scrollbarGutter: "stable" }} className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-4 [overflow-wrap:anywhere]">
        {children}
      </div>
    </DialogContent>
  );
}
