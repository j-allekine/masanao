"use client";

import { Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            aria-label={`Actions for ${activityDesignTitle}`}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => openAfterMenuCloses(onAddActivity)}>
            <Plus />
            Add Activity
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => openAfterMenuCloses(onEdit)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => openAfterMenuCloses(onDelete)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
