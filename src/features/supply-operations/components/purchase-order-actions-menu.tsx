"use client";

import { Pencil, Trash2 } from "lucide-react";

import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";

export default function PurchaseOrderActionsMenu({
  purchaseOrderId,
  purchaseOrderNo,
  actionButtonId,
  onEdit,
  onDelete,
  canDelete = true,
  disabled = false,
}: {
  purchaseOrderId: string;
  purchaseOrderNo: string;
  actionButtonId: string;
  onEdit: () => void;
  onDelete: () => void;
  canDelete?: boolean;
  disabled?: boolean;
}) {
  return (
    <WorkspaceRowActionMenu
      actionButtonId={actionButtonId}
      ariaLabel={`Actions for ${purchaseOrderNo}`}
      disabled={disabled}
      triggerProps={{ "data-purchase-order-action-id": purchaseOrderId }}
      groups={[
        {
          actions: [
            {
              label: "Edit",
              icon: <Pencil data-icon="inline-start" />,
              onSelect: onEdit,
            },
          ],
        },
        ...(canDelete
          ? [{
              actions: [
                {
                  label: "Delete",
                  icon: <Trash2 data-icon="inline-start" />,
                  onSelect: onDelete,
                  variant: "destructive" as const,
                },
              ],
            }]
          : []),
      ]}
    />
  );
}
