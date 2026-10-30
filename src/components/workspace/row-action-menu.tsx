"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { Fragment, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type WorkspaceRowActionTriggerProps = Omit<
  ComponentProps<typeof Button>,
  | "type"
  | "id"
  | "aria-label"
  | "disabled"
  | "variant"
  | "size"
  | "children"
> & {
  [key: `data-${string}`]: string | undefined;
};

export type WorkspaceRowAction = {
  label: string;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  disabled?: boolean;
} & ({ href: string; onNavigate?: ComponentProps<typeof Link>["onNavigate"]; onSelect?: never } | { href?: never; onSelect: () => void });

export type WorkspaceRowActionGroup = {
  actions: readonly WorkspaceRowAction[];
};

export default function WorkspaceRowActionMenu({
  actionButtonId,
  ariaLabel,
  groups,
  disabled = false,
  triggerProps,
  contentClassName,
}: {
  actionButtonId: string;
  ariaLabel: string;
  groups: readonly WorkspaceRowActionGroup[];
  disabled?: boolean;
  triggerProps?: WorkspaceRowActionTriggerProps;
  contentClassName?: string;
}) {
  function openAfterMenuCloses(action: () => void) {
    window.setTimeout(action, 0);
  }

  const nonEmptyGroups = groups.filter((group) => group.actions.length > 0);
  if (!nonEmptyGroups.length) return null;

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
            {...triggerProps}
            className={cn("size-10", triggerProps?.className)}
          />
        }
      >
        <Ellipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("min-w-36", contentClassName)}>
        {nonEmptyGroups.map((group, groupIndex) => (
          <Fragment key={`group-${groupIndex}`}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.actions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  variant={action.variant}
                  disabled={action.disabled}
                  nativeButton={action.href ? false : undefined}
                  render={action.href ? <Link href={action.href} onNavigate={action.onNavigate} /> : undefined}
                  onClick={action.onSelect ? () => openAfterMenuCloses(action.onSelect!) : undefined}
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
