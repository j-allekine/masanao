"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Trash2 } from "lucide-react";

export type DestructiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  error?: ReactNode;
  isPending: boolean;
  onConfirm?: (event: MouseEvent<HTMLButtonElement>) => void;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  /** Opt in for long identities on narrow or short screens. */
  bounded?: boolean;
};

export default function DestructiveDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  isPending,
  onConfirm,
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
  cancelLabel = "Cancel",
  bounded = false,
}: DestructiveDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => {
      if (bounded && isPending && !nextOpen) return;
      onOpenChange(nextOpen);
    }}>
      <AlertDialogContent
        ref={popupRef}
        initialFocus={bounded ? () => popupRef.current : undefined}
        className={bounded ? "max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain [overflow-wrap:anywhere] [&_button]:h-auto [&_button]:min-h-10 [&_button]:py-2 [&_button]:whitespace-normal" : undefined}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Deletion failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          {onConfirm ? (
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={onConfirm}
            >
              {isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              {isPending ? pendingLabel : confirmLabel}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
