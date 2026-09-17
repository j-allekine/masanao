"use client";

import { Ellipsis } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type WorkspaceRowAction = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
};

export type WorkspaceRowActionGroup = {
  actions: readonly WorkspaceRowAction[];
};

export default function WorkspaceRowActionMenu({
  actionButtonId,
  ariaLabel,
  groups,
  disabled = false,
}: {
  actionButtonId: string;
  ariaLabel: string;
  groups: readonly WorkspaceRowActionGroup[];
  disabled?: boolean;
}) {
  function openAfterMenuCloses(action: () => void) {
    window.setTimeout(action, 0);
  }

  const nonEmptyGroups = groups.filter((group) => group.actions.length > 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            id={actionButtonId}
            variant="ghost"
            size="icon-sm"
            aria-label={ariaLabel}
            disabled={disabled}
          />
        }
      >
        <Ellipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {nonEmptyGroups.map((group, groupIndex) => (
          <Fragment key={`group-${groupIndex}`}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.actions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  variant={action.variant}
                  disabled={action.disabled}
                  onClick={() => openAfterMenuCloses(action.onSelect)}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
