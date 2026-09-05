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

export default function VendorActionsMenu({
  vendorName,
  isActive,
  actionButtonId,
  onEdit,
  onToggle,
  onDelete,
  disabled = false,
}: {
  vendorName: string;
  isActive: boolean;
  actionButtonId: string;
  onEdit: () => void;
  onToggle: () => void;
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
            aria-label={`Actions for ${vendorName}`}
            disabled={disabled}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => openAfterMenuCloses(onEdit)}
          >
            <Pencil data-icon="inline-start" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openAfterMenuCloses(onToggle)}>
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
