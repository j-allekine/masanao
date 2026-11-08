"use client";

import { useRouter } from "next/navigation";
import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";

type ExitRequest = { kind: "traverse"; offset: number } | { kind: "link"; href: string };

export function useEditorNavigationGuard(dirty: boolean, pending: boolean) {
  const router = useRouter();
  const [exitRequest, setExitRequest] = useState<ExitRequest | null>(null);
  const confirmedPosition = useRef<number | null>(null);

  const requestExit = useEffectEvent((request: ExitRequest) => {
    if (!pending) setExitRequest(request);
  });

  useLayoutEffect(() => {
    if (!dirty) return;

    const editorPosition: number | undefined = window.history.state?.masanaoHistoryPosition;
    let interruptedPosition: number | null = null;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    function handleLink(event: MouseEvent) {
      if (
        event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      ) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const destination = new URL(link.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;

      event.preventDefault();
      event.stopPropagation();
      requestExit({ kind: "link", href: destination.href });
    }

    function restoreAfterTraversal(event: Event) {
      const destination = (event as CustomEvent<number>).detail;
      if (editorPosition === undefined) return;
      if (destination === confirmedPosition.current) {
        confirmedPosition.current = null;
        return;
      }

      if (destination === editorPosition) {
        if (interruptedPosition === null) return;
        event.preventDefault();
        const offset = interruptedPosition - editorPosition;
        interruptedPosition = null;
        requestExit({ kind: "traverse", offset });
        return;
      }

      // Return to the existing editor entry before the router applies the new route.
      event.preventDefault();
      interruptedPosition = destination;
      window.history.go(editorPosition - destination);
    }

    window.addEventListener("masanao:editor-traversal", restoreAfterTraversal);
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", handleLink, true);
    return () => {
      window.removeEventListener("masanao:editor-traversal", restoreAfterTraversal);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", handleLink, true);
      confirmedPosition.current = null;
    };
  }, [dirty]);

  function dismissExit() {
    setExitRequest(null);
  }

  function confirmExit(discard: () => void) {
    if (pending) return;
    dismissExit();
    if (exitRequest?.kind === "traverse") {
      confirmedPosition.current = window.history.state.masanaoHistoryPosition + exitRequest.offset;
      window.history.go(exitRequest.offset);
      return;
    }

    if (exitRequest?.kind === "link") router.push(exitRequest.href);
    else discard();
  }

  return { exitRequest, dismissExit, confirmExit };
}
