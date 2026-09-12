export type WorkspaceSectionId =
  | "overview"
  | "activity-designs"
  | "master-data"
  | "items"

export type WorkspaceSectionGroupId =
  | "workspace"
  | "supply-operations"
  | "master-data"

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
    id: "workspace",
    label: "Workspace",
    sections: [
      { id: "overview", label: "Overview", href: "/overview", groupId: "workspace" },
      {
        id: "activity-designs",
        label: "Activity Designs",
        href: "/activity-designs",
        groupId: "workspace",
      },
    ],
  },
  {
    id: "supply-operations",
    label: "Supply Operations",
    sections: [
      { id: "items", label: "Items", href: "/items", groupId: "supply-operations" },
    ],
  },
  {
    id: "master-data",
    label: "Master Data",
    sections: [
      { id: "master-data", label: "Master Data", href: "/master-data", groupId: "master-data" },
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
