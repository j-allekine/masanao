"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type OverviewUser = {
  name: string;
  username: string;
};

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: "Today",
    items: [{ label: "Overview", icon: LayoutDashboard, active: true }],
  },
  {
    label: "Plan",
    items: [
      { label: "Activities", icon: ClipboardList },
      { label: "Schedule", icon: CalendarDays },
    ],
  },
  {
    label: "Supplies",
    items: [
      { label: "Inventory", icon: Boxes },
      { label: "Deliveries", icon: Truck },
      { label: "Issuance", icon: PackageCheck },
    ],
  },
  {
    label: "Accountability",
    items: [
      { label: "Records", icon: FileText },
      { label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Staff accounts", icon: Users },
      { label: "Settings", icon: Settings2 },
    ],
  },
];

const overviewModules = [
  {
    eyebrow: "Plan",
    title: "Activities",
    description: "Plan municipal work and keep every activity pointed at its next action.",
    icon: ClipboardList,
  },
  {
    eyebrow: "Supplies",
    title: "Supply movements",
    description: "Follow deliveries and issuance from the storeroom to the activity record.",
    icon: Boxes,
  },
  {
    eyebrow: "Accountability",
    title: "Records",
    description: "Keep the evidence behind each movement clear, complete, and easy to review.",
    icon: FileText,
  },
];

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "MS";
}

function getFirstName(name: string) {
  const firstName = name.split(/\s+/).filter(Boolean)[0];
  return firstName || "there";
}

function AppSidebar({ user }: { user: OverviewUser }) {
  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="gap-5 p-4">
        <Link
          href="/overview"
          className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-heading text-sm font-semibold text-sidebar-primary-foreground">
            M
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-[0.08em]">MASANAO</span>
            <span className="block truncate text-xs text-sidebar-foreground/65">
              Municipal operations
            </span>
          </span>
        </Link>

        <div className="rounded-md border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
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
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        type="button"
                        disabled={!item.active}
                        isActive={item.active}
                        tooltip={item.active ? item.label : `${item.label} is coming next`}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-3 p-4">
        <div className="flex items-center gap-3 rounded-md border border-sidebar-border/70 p-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {getInitials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-sidebar-foreground/65">{user.username}</span>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function OverviewContent({ user }: { user: OverviewUser }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-xs text-muted-foreground">Operations desk</p>
            <p className="truncate text-sm font-medium">Masanao municipality</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 text-masanao-success" aria-hidden="true" />
          <span className="hidden sm:inline">Session active</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-masanao-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
        <section
          aria-labelledby="overview-title"
          className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
              Today · Municipal operations
            </p>
            <h1
              id="overview-title"
              className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Welcome, {getFirstName(user.name)}.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Your work starts here. See what needs attention, then keep the record moving from plan to accountability.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="#needs-attention" />}>
            Review today&apos;s queue
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </section>

        <section aria-labelledby="modules-title" className="grid gap-4 md:grid-cols-3">
          <h2 id="modules-title" className="sr-only">
            Operations modules
          </h2>
          {overviewModules.map((module) => {
            const Icon = module.icon;

            return (
              <article key={module.title} className="min-w-0 rounded-lg border bg-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {module.eyebrow}
                  </span>
                  <Icon className="size-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-8 text-lg font-semibold">{module.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.description}</p>
                <p className="mt-5 text-xs font-medium text-primary">Module connection next</p>
              </article>
            );
          })}
        </section>

        <section
          id="needs-attention"
          aria-labelledby="attention-title"
          className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"
        >
          <article className="min-w-0 rounded-lg border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Needs attention
                </p>
                <h2 id="attention-title" className="mt-2 text-lg font-semibold">
                  Your queue is ready for its first record.
                </h2>
              </div>
              <ClipboardList className="text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="mt-6 rounded-md border border-dashed bg-background p-5">
              <p className="text-sm font-medium">No live items yet</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Once activities, deliveries, or issuances are connected, the next safe action will appear here.
              </p>
            </div>
          </article>

          <article className="min-w-0 rounded-lg border border-primary/20 bg-primary p-5 text-primary-foreground sm:p-6">
            <CheckCircle2 aria-hidden="true" />
            <p className="mt-8 text-xs font-medium uppercase tracking-[0.12em] text-primary-foreground/70">
              Operating principle
            </p>
            <h2 className="mt-2 text-lg font-semibold">Keep the trail complete.</h2>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
              Every handoff should leave the next person with enough context to act confidently.
            </p>
          </article>
        </section>

        <p className="text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.username}</span>.
        </p>
      </div>
    </div>
  );
}

export default function OverviewPage({ user }: { user: OverviewUser }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <OverviewContent user={user} />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
