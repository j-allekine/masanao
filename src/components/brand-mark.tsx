import { SproutIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export default function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      <SproutIcon aria-hidden="true" strokeWidth={1.75} />
    </span>
  );
}
