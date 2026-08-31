import Link from "next/link";

const localPlanningSections = [
  { label: "Activity Designs", href: "/activity-designs", active: true },
  { label: "Activities", active: false },
  { label: "Meal Schedules", active: false },
] as const;

export default function PlanningSectionMenu() {
  return (
      <nav aria-label="Planning sections">
        <ul className="flex flex-wrap gap-2">
          {localPlanningSections.map((section) => (
            <li key={section.label}>
              {section.active ? (
                <Link
                  href={section.href}
                  aria-current="page"
                  className="inline-flex min-h-9 items-center rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {section.label}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-dashed px-3 text-sm text-muted-foreground"
                >
                  <span>{section.label}</span>
                  <span className="text-xs">Coming later</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
  );
}
