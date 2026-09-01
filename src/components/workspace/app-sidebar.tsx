"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  CalendarDays,
  Leaf,
  LayoutDashboard,
  LogOut,
  ChevronDown,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  workspaceSections,
  type WorkspaceSectionId,
} from "@/lib/workspace-navigation"

export type AppSidebarUser = {
  name: string
  username: string
}

const iconBySection: Record<WorkspaceSectionId, LucideIcon> = {
  overview: LayoutDashboard,
  "activity-designs": CalendarDays,
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

  return initials || "MS"
}

function WorkspaceLink() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          render={<Link href="/overview" />}
          tooltip="Masanao municipal operations"
          className="h-auto gap-3 rounded-xl p-0 hover:bg-transparent"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-xs">
            <Leaf aria-hidden="true" className="-rotate-12" />
          </span>
          <span className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-body-sm font-semibold tracking-[0.04em]">MASANAO</span>
            <span className="truncate text-label text-sidebar-foreground/70">Operations Desk</span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function AccountMenu({ user }: { user: AppSidebarUser }) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error("Logout request failed")
      }

      router.replace("/")
      router.refresh()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <Avatar className="size-9 bg-sidebar-primary text-sidebar-primary-foreground after:border-sidebar-primary/20">
              <AvatarFallback className="bg-sidebar-primary text-body-sm font-medium text-sidebar-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 text-left text-body-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-label text-sidebar-foreground/65">{user.username}</span>
            </span>
            <ChevronDown className="ml-auto" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            align={isMobile ? "end" : "start"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <span className="flex flex-col gap-1 px-1 py-1.5 text-left text-body-sm">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-label text-muted-foreground">{user.username}</span>
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
              <LogOut aria-hidden="true" />
              {isLoggingOut ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar({
  user,
  activeSection = "overview",
}: {
  user: AppSidebarUser
  activeSection?: WorkspaceSectionId
}) {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-4 pt-6 pb-7">
        <WorkspaceLink />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3 py-1">
          <SidebarGroupLabel className="h-8 px-3 text-xs uppercase tracking-[0.02em] text-sidebar-foreground/70">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceSections.map((item) => {
                const Icon = iconBySection[item.id]
                const visibleLabel = item.id === "activity-designs" ? "Planning" : item.label

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      render={<Link href={item.href} aria-label={item.label} />}
                      isActive={activeSection === item.id}
                      tooltip={item.label}
                      className="h-10 rounded-lg px-3 text-body-sm"
                    >
                      <Icon />
                      <span>{visibleLabel}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 pt-3 pb-7">
        <AccountMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
