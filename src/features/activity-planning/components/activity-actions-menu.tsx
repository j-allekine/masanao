"use client";

import { Pencil, Trash2 } from "lucide-react";

import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";

export default function ActivityActionsMenu({
  activityName,
  actionButtonId,
  onEdit,
  onDelete,
}: {
  activityName: string;
  actionButtonId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <WorkspaceRowActionMenu
      actionButtonId={actionButtonId}
      ariaLabel={`Actions for ${activityName}`}
      groups={[
        {
          actions: [
            {
              label: "Edit",
              icon: <Pencil data-icon="inline-start" />,
              onSelect: onEdit,
            },
            {
              label: "Delete",
              icon: <Trash2 data-icon="inline-start" />,
              onSelect: onDelete,
              variant: "destructive",
            },
          ],
        },
      ]}
    />
  );
}
