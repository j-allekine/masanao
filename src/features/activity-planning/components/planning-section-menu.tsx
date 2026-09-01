import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FolderOpen,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const localPlanningSections = [
  { label: "Activity Designs", href: "/activity-designs", active: true, icon: ClipboardList },
  { label: "Activities", active: false, icon: FolderOpen },
  { label: "Meal Schedules", active: false, icon: CalendarDays },
] as const;

export default function PlanningSectionMenu({
  selectedCount = 0,
  onClearSelection,
}: {
  selectedCount?: number;
  onClearSelection?: () => void;
}) {
  return (
    <nav aria-label="Planning sections" className="overflow-x-auto border-b">
      <ul className="flex min-w-[64rem] items-end gap-2">
        {localPlanningSections.map((section) => {
          const Icon = section.icon as LucideIcon;
          const tabClassName =
            "group relative flex min-h-16 items-center gap-3 rounded-t-lg border border-b-0 px-4 text-left transition-colors";
          const tabWidth =
            section.label === "Activity Designs"
              ? "w-[23rem]"
              : section.label === "Activities"
                ? "w-[19.25rem]"
                : "w-[21.5rem]";

          return (
            <li key={section.label} className={`shrink-0 ${tabWidth}`}>
              {section.active ? (
                <div className={`${tabClassName} border-primary bg-card text-primary`}>
                  <Link
                    href={section.href}
                    aria-current="page"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-body-sm font-semibold">
                      {section.label}
                    </span>
                  </Link>
                  {selectedCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="h-6 border-primary/10 bg-primary/5 px-2 text-label font-medium text-primary"
                    >
                      {selectedCount} selected
                    </Badge>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Clear Activity Designs selection"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={onClearSelection}
                  >
                    <X aria-hidden="true" />
                  </button>
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden="true" />
                </div>
              ) : (
                <span
                  aria-disabled="true"
                  className={`${tabClassName} border-border bg-muted/20 text-foreground`}
                >
                  <Icon aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-body-sm font-semibold">
                    {section.label}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-full border bg-card px-2 text-label text-muted-foreground">
                    Select
                  </span>
                  <X aria-hidden="true" className="shrink-0 text-foreground" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
