"use client"

// Three sidebar layouts, switchable via ?variant=, on /prototype/sidebar.

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect } from "react"
import type { CSSProperties } from "react"
import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"

type PrototypeVariant = "grouped" | "workflow" | "compact"
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
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Planning",
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
    label: "Administration",
    items: [
      { id: "staff", label: "Staff accounts", icon: Users },
      { id: "settings", label: "Settings", icon: Settings2 },
    ],
  },
]

const navigationItems = navigationGroups.flatMap((group) => group.items)

const prototypeVariants: {
  id: PrototypeVariant
  label: string
  description: string
}[] = [
  {
    id: "grouped",
    label: "Sidebar-07 shell",
    description: "Its inset, icon-collapsing shell with our flat grouped navigation.",
  },
  {
    id: "workflow",
    label: "Task-flow navigation",
    description: "Daily work comes first, with queue counts for pending tasks.",
  },
  {
    id: "compact",
    label: "Compact icon rail",
    description: "A narrow rail for experienced staff who need more canvas space.",
  },
]

const workflowGroups: (NavigationGroup & {
  badges?: Partial<Record<SectionId, string>>
})[] = [
  {
    label: "Run today’s work",
    items: navigationItems.filter((item) =>
      ["dashboard", "activities", "schedule", "deliveries", "issuance"].includes(item.id)
    ),
    badges: {
      activities: "3",
      deliveries: "5",
      issuance: "2",
    },
  },
  {
    label: "Check and report",
    items: navigationItems.filter((item) =>
      ["inventory", "records", "reports"].includes(item.id)
    ),
    badges: { records: "6" },
  },
  {
    label: "Manage access",
    items: navigationItems.filter((item) => ["staff", "settings"].includes(item.id)),
  },
]

function isPrototypeVariant(value: string | null): value is PrototypeVariant {
  return prototypeVariants.some((variant) => variant.id === value)
}

function isSectionId(value: string | null): value is SectionId {
  return navigationItems.some((item) => item.id === value)
}

function sectionHref(variant: PrototypeVariant, section: SectionId) {
  return `/prototype/sidebar?variant=${variant}&section=${section}`
}

function Brand({
  variant,
  compact = false,
}: {
  variant: PrototypeVariant
  compact?: boolean
}) {
  return (
    <Link
      href={sectionHref(variant, "dashboard")}
      className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading text-sm font-semibold text-sidebar-primary-foreground">
        M
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-[0.08em]">MASANAO</span>
          <span className="block truncate text-xs text-sidebar-foreground/65">Municipal operations</span>
        </span>
      )}
    </Link>
  )
}

function UserSummary({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-md p-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
        MR
      </span>
      {compact ? null : (
        <span className="min-w-0 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium">Mara R.</span>
          <span className="block truncate text-xs text-sidebar-foreground/65">Administrator</span>
        </span>
      )}
    </div>
  )
}

function WorkspaceHeader({ variant }: { variant: PrototypeVariant }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          render={<Link href={sectionHref(variant, "dashboard")} />}
          tooltip="Masanao municipal operations"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-heading text-xs font-semibold text-sidebar-primary-foreground">
            M
          </span>
          <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold tracking-[0.06em]">MASANAO</span>
            <span className="truncate text-xs text-sidebar-foreground/65">Operations desk</span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function GroupedSidebar({ activeSection }: { activeSection: SectionId }) {
  const variant: PrototypeVariant = "grouped"

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <WorkspaceHeader variant={variant} />
      </SidebarHeader>
      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-2">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        render={<Link href={sectionHref(variant, item.id)} />}
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
      <SidebarFooter>
        <UserSummary />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function WorkflowSidebar({ activeSection }: { activeSection: SectionId }) {
  const variant: PrototypeVariant = "workflow"

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="gap-4 p-4">
        <Brand variant={variant} />
        <div className="rounded-lg bg-sidebar-primary p-4 text-sidebar-primary-foreground">
          <p className="text-xs text-sidebar-primary-foreground/70">Wednesday, August 28</p>
          <p className="mt-2 text-sm font-semibold">16 items need attention</p>
          <p className="mt-1 text-xs text-sidebar-primary-foreground/70">Start with today’s queue.</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {workflowGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-3">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const badge = group.badges?.[item.id]

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        render={<Link href={sectionHref(variant, item.id)} />}
                        isActive={activeSection === item.id}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-3 p-4">
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/65">
          <span className="size-2 rounded-full bg-masanao-success" aria-hidden="true" />
          All records synced
        </div>
        <UserSummary />
      </SidebarFooter>
    </Sidebar>
  )
}

function CompactSidebar({ activeSection }: { activeSection: SectionId }) {
  const variant: PrototypeVariant = "compact"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="items-center p-3">
        <Brand variant={variant} compact />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup className="px-2 py-3">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      render={<Link href={sectionHref(variant, item.id)} />}
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
      </SidebarContent>
      <SidebarFooter className="items-center p-3">
        <UserSummary compact />
      </SidebarFooter>
    </Sidebar>
  )
}

function PagePlaceholder({ activeSection }: { activeSection: SectionId }) {
  const activeItem = navigationItems.find((item) => item.id === activeSection)

  return (
    <div className="flex min-h-svh flex-col bg-background pb-24">
      <header className="flex min-h-16 items-center gap-3 border-b px-4 sm:px-6">
        <SidebarTrigger />
        <div className="min-w-0 border-l pl-3">
          <p className="truncate text-xs text-muted-foreground">Masanao municipality</p>
          <p className="truncate text-sm font-medium">{activeItem?.label}</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-masanao-content flex-1 flex-col gap-8 px-6 py-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Page placeholder</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {activeItem?.label}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Values and actions for this page are intentionally left as placeholders. Use this prototype to judge the sidebar’s structure, density, and navigation.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3" aria-label="Placeholder summary values">
          {["Summary value", "Summary value", "Summary value"].map((label, index) => (
            <section key={`${label}-${index}`} className="rounded-lg border border-dashed p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Skeleton className="mt-5 h-8 w-24" />
              <Skeleton className="mt-3 h-3 w-32" />
            </section>
          ))}
        </div>

        <section className="flex min-h-64 flex-col gap-5 rounded-lg border border-dashed p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex flex-1 flex-col gap-3 pt-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </section>
      </main>
    </div>
  )
}

function PrototypeSwitcher({
  activeVariant,
  onVariantChange,
}: {
  activeVariant: PrototypeVariant
  onVariantChange: (variant: PrototypeVariant) => void
}) {
  const activeIndex = prototypeVariants.findIndex((variant) => variant.id === activeVariant)
  const activeDetails = prototypeVariants[activeIndex]

  const cycleVariant = useCallback(
    (direction: -1 | 1) => {
      const nextIndex =
        (activeIndex + direction + prototypeVariants.length) % prototypeVariants.length
      onVariantChange(prototypeVariants[nextIndex].id)
    },
    [activeIndex, onVariantChange]
  )

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isEditing =
        target?.matches("input, textarea, [contenteditable='true']") ?? false

      if (isEditing || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {
        return
      }

      cycleVariant(event.key === "ArrowLeft" ? -1 : 1)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [cycleVariant])

  if (process.env.NODE_ENV === "production") {
    return null
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Previous sidebar layout"
        onClick={() => cycleVariant(-1)}
      >
        <ChevronLeft />
      </Button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-sm font-medium">
          {activeIndex + 1} of {prototypeVariants.length} · {activeDetails.label}
        </p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {activeDetails.description}
        </p>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label="Next sidebar layout"
        onClick={() => cycleVariant(1)}
      >
        <ChevronRight />
      </Button>
    </div>
  )
}

function ActiveSidebar({
  activeSection,
  activeVariant,
}: {
  activeSection: SectionId
  activeVariant: PrototypeVariant
}) {
  if (activeVariant === "workflow") {
    return <WorkflowSidebar activeSection={activeSection} />
  }

  if (activeVariant === "compact") {
    return <CompactSidebar activeSection={activeSection} />
  }

  return <GroupedSidebar activeSection={activeSection} />
}

export default function SidebarPrototype() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const variantParam = searchParams.get("variant")
  const sectionParam = searchParams.get("section")
  const activeVariant: PrototypeVariant = isPrototypeVariant(variantParam)
    ? variantParam
    : "grouped"
  const activeSection: SectionId = isSectionId(sectionParam) ? sectionParam : "dashboard"

  const updateVariant = useCallback(
    (nextVariant: PrototypeVariant) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("variant", nextVariant)
      params.set("section", activeSection)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [activeSection, pathname, router, searchParams]
  )

  const sidebarStyle = {
    "--sidebar-width": activeVariant === "workflow" ? "17rem" : "15rem",
  } as CSSProperties

  return (
    <TooltipProvider>
      <SidebarProvider
        key={activeVariant}
        defaultOpen={activeVariant !== "compact"}
        style={sidebarStyle}
      >
        <ActiveSidebar activeSection={activeSection} activeVariant={activeVariant} />
        <SidebarInset>
          <PagePlaceholder activeSection={activeSection} />
        </SidebarInset>
      </SidebarProvider>
      <PrototypeSwitcher activeVariant={activeVariant} onVariantChange={updateVariant} />
    </TooltipProvider>
  )
}
