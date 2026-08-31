export type WorkspaceSectionId =
  | "overview"
  | "activity-designs"

export type WorkspaceSection = {
  id: WorkspaceSectionId
  label: string
  href: string
}

export const workspaceSections: WorkspaceSection[] = [
  { id: "overview", label: "Overview", href: "/overview" },
  {
    id: "activity-designs",
    label: "Activity Designs",
    href: "/activity-designs",
  },
]

export function getWorkspaceSection(value: string): WorkspaceSectionId | undefined {
  return workspaceSections.find((section) => section.id === value)?.id
}

export function getWorkspaceSectionDetails(id: WorkspaceSectionId) {
  return workspaceSections.find((section) => section.id === id) ?? workspaceSections[0]
}
