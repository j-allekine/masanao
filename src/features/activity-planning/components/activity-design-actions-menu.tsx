"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";

import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";

export default function ActivityDesignActionsMenu({
  activityDesignTitle,
  actionButtonId,
  onAddActivity,
  onEdit,
  onDelete,
}: {
  activityDesignTitle: string;
  actionButtonId: string;
  onAddActivity: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <WorkspaceRowActionMenu
      actionButtonId={actionButtonId}
      ariaLabel={`Actions for ${activityDesignTitle}`}
      groups={[
        {
          actions: [
            {
              label: "Add Activity",
              icon: <Plus data-icon="inline-start" />,
              onSelect: onAddActivity,
            },
          ],
        },
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
