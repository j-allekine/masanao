"use client";

import { Ellipsis, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PurchaseOrderActionsMenu({
  purchaseOrderId,
  purchaseOrderNo,
  actionButtonId,
  onEdit,
  onDelete,
  disabled = false,
}: {
  purchaseOrderId: string;
  purchaseOrderNo: string;
  actionButtonId: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  function openAfterMenuCloses(action: () => void) {
    window.setTimeout(action, 0);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            id={actionButtonId}
            data-purchase-order-action-id={purchaseOrderId}
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${purchaseOrderNo}`}
            disabled={disabled}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => openAfterMenuCloses(onEdit)}>
            <Pencil data-icon="inline-start" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => openAfterMenuCloses(onDelete)}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
