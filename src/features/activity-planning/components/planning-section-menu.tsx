import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const localPlanningSections = [
  { label: "Activity Designs", href: "/activity-designs", active: true, icon: ClipboardList },
  { label: "Activities", active: false, icon: FolderOpen },
  { label: "Meal Schedules", active: false, icon: CalendarDays },
] as const;

export default function PlanningSectionMenu() {
  return (
    <nav aria-label="Planning sections" className="overflow-x-auto border-b">
      <ul className="flex min-w-max items-end gap-1">
        {localPlanningSections.map((section) => {
          const Icon = section.icon as LucideIcon;
          const tabClassName =
            "relative flex min-h-10 shrink-0 items-center gap-2 rounded-t-md border border-b-0 px-3 text-left transition-colors";

          return (
            <li key={section.label}>
              {section.active ? (
                <div className={`${tabClassName} border-primary bg-card text-primary`}>
                  <Link
                    href={section.href}
                    aria-current="page"
                    className="flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon aria-hidden="true" />
                    <span className="truncate text-body-sm font-semibold">
                      {section.label}
                    </span>
                  </Link>
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <span
                  aria-disabled="true"
                  className={`${tabClassName} border-border bg-muted/20 text-muted-foreground`}
                >
                  <Icon aria-hidden="true" />
                  <span className="truncate text-body-sm font-medium">
                    {section.label}
                  </span>
                  <Badge
                    variant="outline"
                    className="h-5 bg-card px-1.5 text-label text-muted-foreground"
                  >
                    Coming later
                  </Badge>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
