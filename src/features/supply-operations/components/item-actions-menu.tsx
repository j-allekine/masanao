"use client";

import {
  CheckCircle2,
  CircleOff,
  Ellipsis,
  Pencil,
  Trash2,
  Scale,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            variant="outline"
            size="icon-lg"
            className="bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Actions for ${itemName}`}
            disabled={disabled}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="min-h-9 gap-2 px-2 whitespace-nowrap focus:bg-muted focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground"
            onClick={() => openAfterMenuCloses(onUnits)}
          >
            <Scale data-icon="inline-start" />
            {canManage ? "Manage units" : "Units"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {canManage ? <>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="min-h-9 gap-2 px-2 whitespace-nowrap focus:bg-muted focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground"
            onClick={() => openAfterMenuCloses(onEdit!)}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-9 gap-2 px-2 whitespace-nowrap focus:bg-muted focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground"
            onClick={() =>
              openAfterMenuCloses(() => onSetActive!(!isActive))
            }
          >
            {isActive ? (
              <CircleOff data-icon="inline-start" />
            ) : (
              <CheckCircle2 data-icon="inline-start" />
            )}
            {isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            className="min-h-9 gap-2 px-2 whitespace-nowrap"
            onClick={() => openAfterMenuCloses(onDelete!)}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
        </> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
