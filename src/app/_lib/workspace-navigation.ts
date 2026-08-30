export type WorkspaceSectionId =
  | "overview"
  | "activities"
  | "schedule"
  | "inventory"
  | "deliveries"
  | "issuance"
  | "records"
  | "reports"
  | "staff"
  | "settings"

export type WorkspaceSection = {
  id: WorkspaceSectionId
  label: string
  href: string
  group: string
}

export type WorkspaceNavigationGroup = {
  label: string
  items: WorkspaceSection[]
}

export const workspaceSections: WorkspaceSection[] = [
  { id: "overview", label: "Overview", href: "/overview", group: "Today" },
  { id: "activities", label: "Activities", href: "/activities", group: "Plan" },
  { id: "schedule", label: "Schedule", href: "/schedule", group: "Plan" },
  { id: "inventory", label: "Inventory", href: "/inventory", group: "Supplies" },
  { id: "deliveries", label: "Deliveries", href: "/deliveries", group: "Supplies" },
  { id: "issuance", label: "Issuance", href: "/issuance", group: "Supplies" },
  { id: "records", label: "Records", href: "/records", group: "Accountability" },
  { id: "reports", label: "Reports", href: "/reports", group: "Accountability" },
  { id: "staff", label: "Staff accounts", href: "/staff", group: "Admin" },
  { id: "settings", label: "Settings", href: "/settings", group: "Admin" },
]

export const workspaceNavigationGroups: WorkspaceNavigationGroup[] = [
  "Today",
  "Plan",
  "Supplies",
  "Accountability",
  "Admin",
].map((group) => ({
  label: group,
  items: workspaceSections.filter((section) => section.group === group),
}))

export function getWorkspaceSection(value: string): WorkspaceSectionId | undefined {
  return workspaceSections.find((section) => section.id === value)?.id
}

export function getWorkspaceSectionDetails(id: WorkspaceSectionId) {
  return workspaceSections.find((section) => section.id === id) ?? workspaceSections[0]
}
