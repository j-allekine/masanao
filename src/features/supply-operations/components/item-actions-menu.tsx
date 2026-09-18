"use client";

import {
  CheckCircle2,
  CircleOff,
  Pencil,
  Trash2,
  Scale,
} from "lucide-react";

import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";

export default function ItemActionsMenu({
  itemId,
  itemName,
  isActive,
  actionButtonId,
  onEdit,
  onSetActive,
  onDelete,
  onUnits,
  canManage,
  disabled = false,
}: {
  itemId: string;
  itemName: string;
  isActive: boolean;
  actionButtonId: string;
  onEdit?: () => void;
  onSetActive?: (isActive: boolean) => void;
  onDelete?: () => void;
  onUnits: () => void;
  canManage: boolean;
  disabled?: boolean;
}) {
  return (
    <WorkspaceRowActionMenu
      actionButtonId={actionButtonId}
      ariaLabel={`Actions for ${itemName}`}
      disabled={disabled}
      triggerProps={{ "data-item-action-id": itemId }}
      groups={[
        {
          actions: [
            {
              label: canManage ? "Manage units" : "Units",
              icon: <Scale data-icon="inline-start" />,
              onSelect: onUnits,
            },
          ],
        },
        ...(canManage
          ? [
              {
                actions: [
                  {
                    label: "Edit",
                    icon: <Pencil data-icon="inline-start" />,
                    onSelect: onEdit!,
                  },
                  {
                    label: isActive ? "Deactivate" : "Activate",
                    icon: isActive ? (
                      <CircleOff data-icon="inline-start" />
                    ) : (
                      <CheckCircle2 data-icon="inline-start" />
                    ),
                    onSelect: () => onSetActive!(!isActive),
                  },
                ],
              },
              {
                actions: [
                  {
                    label: "Delete",
                    icon: <Trash2 data-icon="inline-start" />,
                    onSelect: onDelete!,
                    variant: "destructive" as const,
                  },
                ],
              },
            ]
          : []),
      ]}
    />
  );
}
