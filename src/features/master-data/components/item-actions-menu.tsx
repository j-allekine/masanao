"use client";

import { Ellipsis, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ItemActionsMenu({
  itemId,
  itemName,
  actionButtonId,
  onEdit,
  disabled = false,
}: {
  itemId: string;
  itemName: string;
  actionButtonId: string;
  onEdit: () => void;
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
            data-item-action-id={itemId}
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${itemName}`}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
