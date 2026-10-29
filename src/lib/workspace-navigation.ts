export type WorkspaceSectionId =
  | "overview"
  | "activity-designs"
  | "master-data"
  | "items"
  | "inventory"
  | "recipes"
  | "purchase-orders"

export type WorkspaceSectionGroupId =
  | "operations"
  | "setup"

export type WorkspaceSection = {
  id: WorkspaceSectionId
  label: string
  href: string
  groupId: WorkspaceSectionGroupId
}

export type WorkspaceSectionGroup = {
  id: WorkspaceSectionGroupId
  label: string
  sections: WorkspaceSection[]
}

export const workspaceSectionGroups: WorkspaceSectionGroup[] = [
  {
    id: "operations",
    label: "Operations",
    sections: [
      { id: "overview", label: "Dashboard", href: "/dashboard", groupId: "operations" },
      {
        id: "activity-designs",
        label: "Activity Designs",
        href: "/activity-designs",
        groupId: "operations",
      },
      { id: "inventory", label: "Inventory", href: "/inventory", groupId: "operations" },
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        href: "/purchase-orders",
        groupId: "operations",
      },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    sections: [
      { id: "items", label: "Items", href: "/items", groupId: "setup" },
      { id: "recipes", label: "Recipes", href: "/recipes", groupId: "setup" },
      { id: "master-data", label: "Master Data", href: "/master-data", groupId: "setup" },
    ],
  },
]

export const workspaceSections = workspaceSectionGroups.flatMap(
  (group) => group.sections,
)

export function getWorkspaceSection(value: string): WorkspaceSectionId | undefined {
  return workspaceSections.find((section) => section.id === value)?.id
}

export function getWorkspaceSectionDetails(id: WorkspaceSectionId) {
  return workspaceSections.find((section) => section.id === id) ?? workspaceSections[0]
}

/** Display labels shared by ready, loading and failed workspace surfaces. */
export function getWorkspaceHeaderTitle(id: WorkspaceSectionId) {
  if (id === "activity-designs") return "Planning"
  const section = getWorkspaceSectionDetails(id)
  return id === "inventory" || id === "items" || id === "recipes" || id === "purchase-orders"
    ? "Supply Operations"
    : section.label
}
