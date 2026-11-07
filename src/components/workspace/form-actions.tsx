"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function WorkspaceFormActionButtons({
  onCancel,
  isPending,
  submitDisabled = false,
  submitLabel,
  pendingLabel,
  submitIcon,
  cancelLabel = "Cancel",
  form,
}: {
  onCancel?: () => void;
  isPending: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  pendingLabel: string;
  submitIcon?: ReactNode;
  cancelLabel?: string;
  form?: string;
}) {
  return (
    <>
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      ) : null}
      <Button type="submit" form={form} disabled={isPending || submitDisabled}>
        {isPending ? <Spinner data-icon="inline-start" /> : submitIcon}
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </>
  );
}
