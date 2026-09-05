"use client";

import { Ellipsis, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function OfficeActionsMenu({
  officeName,
  actionButtonId,
  onEdit,
  disabled = false,
}: {
  officeName: string;
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
        <DropdownMenuItem onClick={() => openAfterMenuCloses(onEdit)}>
          <Pencil data-icon="inline-start" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
