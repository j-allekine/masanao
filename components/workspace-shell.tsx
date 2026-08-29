"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  PackageCheck,
  Settings2,
  Truck,
  Users,
} from "lucide-react";

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
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export type WorkspaceUser = {
  name: string;
  username: string;
};

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navigationGroups: NavigationGroup[] = [
  {
    label: "Today",
    items: [{ label: "Overview", icon: LayoutDashboard, href: "/overview" }],
  },
  {
    label: "Plan",
    items: [
      { label: "Activity designs", icon: ClipboardList, href: "/activity-designs" },
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

function AppSidebar({
  user,
  activePath,
}: {
  user: WorkspaceUser;
  activePath: string;
}) {
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
                  const isActive = item.href === activePath;

                  return (
                    <SidebarMenuItem key={item.label}>
                      {item.href ? (
                        <SidebarMenuButton
                          isActive={isActive}
                          render={<Link href={item.href} />}
                          tooltip={item.label}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          type="button"
                          disabled
                          tooltip={`${item.label} is coming next`}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
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

export default function WorkspaceShell({
  user,
  activePath,
  children,
}: {
  user: WorkspaceUser;
  activePath: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} activePath={activePath} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
