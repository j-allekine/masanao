"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const localPlanningSections = [
  {
    id: "activity-designs",
    label: "Activity Designs",
    href: "/activity-designs",
    disabled: false,
    icon: ClipboardList,
  },
  {
    id: "activities",
    label: "Activities",
    href: "/activities",
    disabled: false,
    icon: FolderOpen,
  },
  {
    id: "meal-schedules",
    label: "Meal Schedules",
    href: undefined,
    disabled: true,
    icon: CalendarDays,
  },
] as const;

export type PlanningSectionId = (typeof localPlanningSections)[number]["id"];

export default function PlanningSectionMenu({
  activeSection,
  query = "",
}: {
  activeSection: Exclude<PlanningSectionId, "meal-schedules">;
  query?: string;
}) {
  return (
    <nav aria-label="Planning sections" className="overflow-x-auto border-b">
      <ul className="flex min-w-max items-end gap-1">
        {localPlanningSections.map((section) => {
          const Icon = section.icon as LucideIcon;
          const isActive = section.id === activeSection;
          const tabClassName =
            "relative flex min-h-10 shrink-0 items-center gap-2 rounded-t-md border border-b-0 px-3 text-left transition-colors";
          const href =
            section.href
              ? `${section.href}${query ? `?${query}` : ""}`
              : "#";

          return (
            <li key={section.label}>
              {section.disabled ? (
                <span
                  aria-disabled="true"
                  className={cn(
                    tabClassName,
                    "border-border bg-muted/20 text-muted-foreground",
                  )}
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
              ) : isActive ? (
                <div
                  className={cn(
                    tabClassName,
                    "border-primary bg-card text-primary",
                  )}
                >
                  <Link
                    href={href}
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
                <Link
                  href={href}
                  className={cn(
                    tabClassName,
                    "border-border bg-card text-muted-foreground hover:bg-muted/35 hover:text-foreground",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <Icon aria-hidden="true" />
                  <span className="truncate text-body-sm font-medium">
                    {section.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
