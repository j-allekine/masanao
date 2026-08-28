"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { CSSProperties } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  PackageCheck,
  Settings2,
  Truck,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

type PrototypeVariant = "workbench" | "quiet" | "compact"
type SectionId =
  | "dashboard"
  | "activities"
  | "schedule"
  | "inventory"
  | "deliveries"
  | "issuance"
  | "records"
  | "reports"
  | "staff"
  | "settings"

type NavigationItem = {
  id: SectionId
  label: string
  icon: LucideIcon
}

type NavigationGroup = {
  label: string
  items: NavigationItem[]
}

const navigationGroups: NavigationGroup[] = [
  {
    label: "Today",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Plan",
    items: [
      { id: "activities", label: "Activities", icon: ClipboardList },
      { id: "schedule", label: "Schedule", icon: CalendarDays },
    ],
  },
  {
    label: "Supplies",
    items: [
      { id: "inventory", label: "Inventory", icon: Boxes },
      { id: "deliveries", label: "Deliveries", icon: Truck },
      { id: "issuance", label: "Issuance", icon: PackageCheck },
    ],
  },
  {
    label: "Accountability",
    items: [
      { id: "records", label: "Records", icon: FileText },
      { id: "reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "staff", label: "Staff accounts", icon: Users },
      { id: "settings", label: "Settings", icon: Settings2 },
    ],
  },
]

const sectionIds = navigationGroups.flatMap((group) =>
  group.items.map((item) => item.id)
)

const sectionContent: Record<
  SectionId,
  {
    eyebrow: string
    title: string
    description: string
    action: string
    metrics: { label: string; value: string; detail: string }[]
  }
> = {
  dashboard: {
    eyebrow: "Today · Wednesday, August 28",
    title: "Good morning, Mara.",
    description: "Here is the work that needs attention across the municipality.",
    action: "Review today’s queue",
    metrics: [
      { label: "Open activities", value: "08", detail: "3 need planning" },
      { label: "Supply movements", value: "14", detail: "5 arriving today" },
      { label: "Records to review", value: "06", detail: "2 due before noon" },
    ],
  },
  activities: {
    eyebrow: "Plan · Activities",
    title: "Activities",
    description: "Keep each municipal activity moving toward its next safe action.",
    action: "Add activity",
    metrics: [
      { label: "Draft", value: "03", detail: "Awaiting details" },
      { label: "Scheduled", value: "05", detail: "This month" },
      { label: "Completed", value: "18", detail: "This quarter" },
    ],
  },
  schedule: {
    eyebrow: "Plan · Schedule",
    title: "Schedule",
    description: "See what is planned next and where staff or supplies may overlap.",
    action: "Plan an activity",
    metrics: [
      { label: "Today", value: "04", detail: "Across 3 locations" },
      { label: "This week", value: "17", detail: "2 conflicts" },
      { label: "Unassigned", value: "02", detail: "Need an owner" },
    ],
  },
  inventory: {
    eyebrow: "Supplies · Inventory",
    title: "Inventory",
    description: "Know what is available before the next request reaches the storeroom.",
    action: "View low stock",
    metrics: [
      { label: "Tracked items", value: "126", detail: "Across 4 locations" },
      { label: "Low stock", value: "07", detail: "Need replenishment" },
      { label: "Last count", value: "Aug 27", detail: "98% reconciled" },
    ],
  },
  deliveries: {
    eyebrow: "Supplies · Deliveries",
    title: "Deliveries",
    description: "Record incoming supplies and keep the receiving trail complete.",
    action: "Record delivery",
    metrics: [
      { label: "Expected today", value: "05", detail: "2 in transit" },
      { label: "For review", value: "03", detail: "Missing attachments" },
      { label: "Received this month", value: "42", detail: "Across 9 suppliers" },
    ],
  },
  issuance: {
    eyebrow: "Supplies · Issuance",
    title: "Issuance",
    description: "Track where supplies go after they leave the storeroom.",
    action: "Create issuance",
    metrics: [
      { label: "Pending", value: "04", detail: "Need approval" },
      { label: "Issued today", value: "11", detail: "For 6 activities" },
      { label: "This month", value: "86", detail: "All acknowledged" },
    ],
  },
  records: {
    eyebrow: "Accountability · Records",
    title: "Records",
    description: "Find the evidence behind each movement, activity, and decision.",
    action: "Find a record",
    metrics: [
      { label: "Needs review", value: "06", detail: "Oldest is 2 days" },
      { label: "Complete", value: "91%", detail: "This month" },
      { label: "Archived", value: "284", detail: "All time" },
    ],
  },
  reports: {
    eyebrow: "Accountability · Reports",
    title: "Reports",
    description: "Turn operational records into a clear view for the people accountable.",
    action: "Create a report",
    metrics: [
      { label: "Ready to share", value: "04", detail: "Updated this week" },
      { label: "In progress", value: "02", detail: "Awaiting final data" },
      { label: "Last published", value: "Aug 25", detail: "Monthly supplies" },
    ],
  },
  staff: {
    eyebrow: "Admin · Staff accounts",
    title: "Staff accounts",
    description: "Keep access aligned with each staff member’s responsibilities.",
    action: "Add staff account",
    metrics: [
      { label: "Active staff", value: "18", detail: "Across 5 teams" },
      { label: "Pending access", value: "02", detail: "Need administrator review" },
      { label: "Last change", value: "Today", detail: "One role updated" },
    ],
  },
  settings: {
    eyebrow: "Admin · Settings",
    title: "Settings",
    description: "Manage the municipality’s operational defaults and account rules.",
    action: "Review settings",
    metrics: [
      { label: "Organization", value: "Ready", detail: "Profile complete" },
      { label: "Permissions", value: "5", detail: "Role groups" },
      { label: "Audit status", value: "Good", detail: "No open warnings" },
    ],
  },
}

const prototypeVariants: {
  id: PrototypeVariant
  label: string
  description: string
}[] = [
  {
    id: "workbench",
    label: "Workbench rail",
    description: "Deep green, grouped, and task-oriented",
  },
  {
    id: "quiet",
    label: "Quiet rail",
    description: "Light surface with less visual weight",
  },
  {
    id: "compact",
    label: "Compact rail",
    description: "Icon-first for experienced staff",
  },
]

function isPrototypeVariant(value: string | null): value is PrototypeVariant {
  return prototypeVariants.some((variant) => variant.id === value)
}

function isSectionId(value: string | null): value is SectionId {
  return sectionIds.includes(value as SectionId)
}

function getSidebarStyle(variant: PrototypeVariant): CSSProperties {
  const baseStyle = {
    "--sidebar-width": "15rem",
  }

  if (variant !== "quiet") {
    return baseStyle as CSSProperties
  }

  return {
    ...baseStyle,
    "--sidebar": "var(--masanao-surface-raised)",
    "--sidebar-foreground": "var(--masanao-ink)",
    "--sidebar-primary": "var(--masanao-primary)",
    "--sidebar-primary-foreground": "var(--masanao-on-primary)",
    "--sidebar-accent": "var(--masanao-primary-soft)",
    "--sidebar-accent-foreground": "var(--masanao-primary-strong)",
    "--sidebar-border": "var(--masanao-border)",
    "--sidebar-ring": "var(--masanao-focus-ring)",
    "--color-sidebar": "var(--masanao-surface-raised)",
    "--color-sidebar-foreground": "var(--masanao-ink)",
    "--color-sidebar-primary": "var(--masanao-primary)",
    "--color-sidebar-primary-foreground": "var(--masanao-on-primary)",
    "--color-sidebar-accent": "var(--masanao-primary-soft)",
    "--color-sidebar-accent-foreground": "var(--masanao-primary-strong)",
    "--color-sidebar-border": "var(--masanao-border)",
    "--color-sidebar-ring": "var(--masanao-focus-ring)",
  } as CSSProperties
}

function AppSidebar({
  activeSection,
  variant,
}: {
  activeSection: SectionId
  variant: PrototypeVariant
}) {
  return (
    <Sidebar
      collapsible={variant === "compact" ? "icon" : "offcanvas"}
      variant={variant === "quiet" ? "inset" : "sidebar"}
    >
      <SidebarHeader className="gap-5 p-4">
        <Link
          href={`/prototype/sidebar?variant=${variant}&section=dashboard`}
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading text-sm font-semibold text-sidebar-primary-foreground">
            M
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold tracking-[0.08em]">
              MASANAO
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/65">
              Municipal operations
            </span>
          </span>
        </Link>

        <div className="rounded-md border border-sidebar-border/70 bg-sidebar-accent/45 p-3 group-data-[collapsible=icon]:hidden">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/60">
            Current workspace
          </p>
          <p className="mt-1 truncate text-sm font-medium">Operations desk</p>
          <p className="mt-1 text-xs text-sidebar-foreground/65">Masanao, Lanao del Sur</p>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-3">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const href = `/prototype/sidebar?variant=${variant}&section=${item.id}`

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={activeSection === item.id}
                        tooltip={item.label}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-3 p-4">
        <div className="flex items-center gap-3 rounded-md border border-sidebar-border/70 p-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            MR
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-medium">Mara R.</span>
            <span className="block truncate text-xs text-sidebar-foreground/65">Administrator</span>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function PrototypeSwitcher({
  activeVariant,
  onVariantChange,
}: {
  activeVariant: PrototypeVariant
  onVariantChange: (variant: PrototypeVariant) => void
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Sidebar prototype
        </p>
        <p className="truncate text-sm font-medium">
          Viewing: {prototypeVariants.find((item) => item.id === activeVariant)?.label}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" aria-label="Sidebar prototype views">
        {prototypeVariants.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={activeVariant === item.id ? "default" : "ghost"}
            aria-pressed={activeVariant === item.id}
            onClick={() => onVariantChange(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function StatusRow({
  label,
  detail,
  tone,
}: {
  label: string
  detail: string
  tone: "ready" | "attention" | "neutral"
}) {
  const toneClass = {
    ready: "bg-masanao-success",
    attention: "bg-masanao-accent-strong",
    neutral: "bg-muted-foreground/45",
  }[tone]

  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`size-2 shrink-0 rounded-full ${toneClass}`} aria-hidden="true" />
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{detail}</span>
    </div>
  )
}

function DashboardContent({
  activeSection,
  activeVariant,
}: {
  activeSection: SectionId
  activeVariant: PrototypeVariant
}) {
  const content = sectionContent[activeSection]
  const variant = prototypeVariants.find((item) => item.id === activeVariant)

  return (
    <div className="flex min-h-svh flex-col bg-background pb-28">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-xs text-muted-foreground">Operations desk</p>
            <p className="truncate text-sm font-medium">Masanao municipality</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="size-2 rounded-full bg-masanao-success" aria-hidden="true" />
          Prototype state · {variant?.label}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-masanao-content flex-1 flex-col gap-8 px-6 py-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
              {content.eyebrow}
            </p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {content.description}
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="#next-action" />}>
            {content.action}
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {content.metrics.map((metric) => (
            <article key={metric.label} className="min-w-0 rounded-lg border bg-card p-5">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-4 font-heading text-3xl font-semibold tracking-tight">{metric.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{metric.detail}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="min-w-0 rounded-lg border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {activeSection === "dashboard" ? "Needs attention" : "Sample workspace"}
                </p>
                <h2 className="mt-2 text-lg font-semibold">A clear next action</h2>
              </div>
              <Archive className="text-muted-foreground" aria-hidden="true" />
            </div>

            <div className="mt-5">
              <StatusRow label="Confirm rice delivery for Activity 24-018" detail="Due 10:00 AM" tone="attention" />
              <StatusRow label="Review the weekly issuance record" detail="2 attachments" tone="neutral" />
              <StatusRow label="Inventory count reconciled" detail="Completed" tone="ready" />
            </div>
          </article>

          <article id="next-action" className="min-w-0 rounded-lg border border-primary/20 bg-primary p-5 text-primary-foreground sm:p-6">
            <CheckCircle2 aria-hidden="true" />
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.12em] text-primary-foreground/70">
              Next safe action
            </p>
            <h2 className="mt-2 text-lg font-semibold">Keep the delivery trail complete.</h2>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
              One missing receipt can slow the whole record. Start with the two deliveries waiting for review.
            </p>
            <Link
              href={`/prototype/sidebar?variant=${activeVariant}&section=deliveries`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline decoration-primary-foreground/35 underline-offset-4 hover:decoration-primary-foreground"
            >
              Open deliveries
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </article>
        </div>

        <p className="text-xs text-muted-foreground">
          Prototype question: can staff understand where they are, what needs attention, and what to do next without losing the stable navigation rail?
        </p>
      </div>
    </div>
  )
}

export default function SidebarPrototype() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const variantParam = searchParams.get("variant")
  const sectionParam = searchParams.get("section")
  const activeVariant: PrototypeVariant = isPrototypeVariant(variantParam)
    ? variantParam
    : "workbench"
  const activeSection: SectionId = isSectionId(sectionParam) ? sectionParam : "dashboard"

  function updateVariant(nextVariant: PrototypeVariant) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("variant", nextVariant)
    params.set("section", activeSection)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <TooltipProvider>
      <SidebarProvider
        key={activeVariant}
        defaultOpen={activeVariant !== "compact"}
        style={getSidebarStyle(activeVariant)}
      >
        <AppSidebar activeSection={activeSection} variant={activeVariant} />
        <SidebarInset>
          <DashboardContent activeSection={activeSection} activeVariant={activeVariant} />
        </SidebarInset>
      </SidebarProvider>
      <PrototypeSwitcher activeVariant={activeVariant} onVariantChange={updateVariant} />
    </TooltipProvider>
  )
}
