"use client";

import {
  CheckCircle2,
  CircleOff,
  Ellipsis,
  Pencil,
  Trash2,
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

export default function OfficeActionsMenu({
  officeName,
  isActive,
  actionButtonId,
  onEdit,
  onSetActive,
  onDelete,
  disabled = false,
}: {
  officeName: string;
  isActive: boolean;
  actionButtonId: string;
  onEdit: () => void;
  onSetActive: (isActive: boolean) => void;
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
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${officeName}`}
            disabled={disabled}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => openAfterMenuCloses(onEdit)}>
            <Pencil data-icon="inline-start" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              openAfterMenuCloses(() => onSetActive(!isActive))
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
