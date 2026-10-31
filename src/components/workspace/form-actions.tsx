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
  compactSubmitLabel,
  cancelLabel = "Cancel",
}: {
  onCancel?: () => void;
  isPending: boolean;
  submitDisabled?: boolean;
  submitLabel: string;
  pendingLabel: string;
  submitIcon?: ReactNode;
  /** Short visible phone wording; the complete action remains its accessible name. */
  compactSubmitLabel?: string;
  cancelLabel?: string;
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
      <Button type="submit" aria-label={compactSubmitLabel ? isPending ? pendingLabel : submitLabel : undefined} disabled={isPending || submitDisabled}>
        {isPending ? <Spinner data-icon="inline-start" /> : submitIcon}
        {isPending ? pendingLabel : compactSubmitLabel ? <><span className="sm:hidden">{compactSubmitLabel}</span><span className="hidden sm:inline">{submitLabel}</span></> : submitLabel}
      </Button>
    </>
  );
}
