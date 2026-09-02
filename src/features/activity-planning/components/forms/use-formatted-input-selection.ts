"use client";

import { useEffect, useRef } from "react";

type InputSelection = {
  start: number;
  end: number;
};

export function useFormattedInputSelection(value: string) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<InputSelection | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    const selection = pendingSelection.current;

    if (!input || !selection || document.activeElement !== input) return;

    input.setSelectionRange(selection.start, selection.end);
    pendingSelection.current = null;
  }, [value]);

  function queueSelection(
    selectionStart: number | null,
    selectionEnd: number | null,
  ) {
    pendingSelection.current =
      selectionStart !== null && selectionEnd !== null
        ? { start: selectionStart, end: selectionEnd }
        : null;
  }

  return { inputRef, queueSelection };
}
