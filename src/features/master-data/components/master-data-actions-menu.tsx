"use client";

import { CheckCircle2, CircleOff, Pencil, Trash2 } from "lucide-react";

import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";

export default function MasterDataActionsMenu({
  recordName,
  isActive,
  actionButtonId,
  onEdit,
  onSetActive,
  onDelete,
  disabled = false,
}: {
  recordName: string;
  isActive: boolean;
  actionButtonId: string;
  onEdit: () => void;
  onSetActive: (isActive: boolean) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <WorkspaceRowActionMenu
      actionButtonId={actionButtonId}
      ariaLabel={`Actions for ${recordName}`}
      disabled={disabled}
      groups={[
        {
          actions: [
            {
              label: "Edit",
              icon: <Pencil data-icon="inline-start" />,
              onSelect: onEdit,
            },
            {
              label: isActive ? "Deactivate" : "Activate",
              icon: isActive ? (
                <CircleOff data-icon="inline-start" />
              ) : (
                <CheckCircle2 data-icon="inline-start" />
              ),
              onSelect: () => onSetActive(!isActive),
            },
          ],
        },
        {
          actions: [
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
