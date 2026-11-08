"use client";

import { useRouter } from "next/navigation";
import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";

type ExitRequest = { kind: "traverse"; key: string } | { kind: "link"; href: string };

// The project's DOM types do not yet include the Navigation API.
type BrowserNavigation = EventTarget & {
  currentEntry: { key: string } | null;
  traverseTo(key: string): { finished: Promise<unknown> };
};

type HistoryNavigationEvent = Event & {
  navigationType: string;
  destination: { key: string; sameDocument: boolean };
};

function getBrowserNavigation() {
  return (window as Window & { navigation?: BrowserNavigation }).navigation;
}

export function useEditorNavigationGuard(dirty: boolean, pending: boolean) {
  const router = useRouter();
  const [exitRequest, setExitRequest] = useState<ExitRequest | null>(null);
  const confirmedEntry = useRef<string | null>(null);

  const requestExit = useEffectEvent((request: ExitRequest) => {
    if (!pending) setExitRequest(request);
  });

  useLayoutEffect(() => {
    if (!dirty) return;

    const navigation = getBrowserNavigation();
    const editorEntry = navigation?.currentEntry?.key;
    let interruptedEntry: string | null = null;

    function handleNavigate(event: Event) {
      const { navigationType, destination } = event as HistoryNavigationEvent;
      if (
        navigationType !== "traverse" || !destination.sameDocument || !event.cancelable ||
        destination.key === editorEntry || destination.key === confirmedEntry.current
      ) return;

      event.preventDefault();
      requestExit({ kind: "traverse", key: destination.key });
    }

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

    function restoreAfterTraversal(event: PopStateEvent) {
      const destination = navigation?.currentEntry?.key;
      if (!navigation || !editorEntry || !destination) return;
      if (destination === confirmedEntry.current) {
        confirmedEntry.current = null;
        return;
      }

      if (destination === editorEntry) {
        if (!interruptedEntry) return;
        event.stopImmediatePropagation();
        const key = interruptedEntry;
        interruptedEntry = null;
        requestExit({ kind: "traverse", key });
        return;
      }

      // Restore the existing editor entry before Next applies the new route.
      // Traversing by key leaves both Back and Forward entries intact.
      event.stopImmediatePropagation();
      interruptedEntry = destination;
      void navigation.traverseTo(editorEntry).finished.catch(() => {
        interruptedEntry = null;
      });
    }

    navigation?.addEventListener("navigate", handleNavigate);
    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("popstate", restoreAfterTraversal, true);
    document.addEventListener("click", handleLink, true);
    return () => {
      navigation?.removeEventListener("navigate", handleNavigate);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("popstate", restoreAfterTraversal, true);
      document.removeEventListener("click", handleLink, true);
    };
  }, [dirty]);

  function dismissExit() {
    setExitRequest(null);
  }

  function confirmExit(discard: () => void) {
    if (pending) return;
    dismissExit();
    if (exitRequest?.kind === "traverse") {
      const navigation = getBrowserNavigation();
      if (!navigation) return;
      const { key } = exitRequest;
      confirmedEntry.current = key;
      void navigation.traverseTo(key).finished.catch(() => {
        // A superseding navigation can remove the requested entry.
        if (confirmedEntry.current === key) confirmedEntry.current = null;
      });
      return;
    }

    if (exitRequest?.kind === "link") router.push(exitRequest.href);
    else discard();
  }

  return { exitRequest, dismissExit, confirmExit };
}
