"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

type ExitRequest = { kind: "back" } | { kind: "link"; href: string };

function hasGuardEntry() {
  return window.history.state?.masanaoEditorGuard === window.location.href;
}

export function useEditorNavigationGuard(dirty: boolean, pending: boolean) {
  const router = useRouter();
  const [exitRequest, setExitRequest] = useState<ExitRequest | null>(null);
  const allowLeave = useRef(false);
  const releaseInProgress = useRef<Promise<void> | null>(null);

  const requestExit = useEffectEvent((request: ExitRequest) => {
    if (!pending) setExitRequest(request);
  });

  const release = useCallback(() => {
    if (releaseInProgress.current) return releaseInProgress.current;
    if (!hasGuardEntry()) return Promise.resolve();

    // Return to the original editor entry before a save or a new navigation.
    // The browser keeps the actual preceding page in the Back stack.
    allowLeave.current = true;
    releaseInProgress.current = new Promise<void>((resolve) => {
      function onRelease(event: PopStateEvent) {
        event.stopImmediatePropagation();
        allowLeave.current = false;
        releaseInProgress.current = null;
        resolve();
      }

      window.addEventListener("popstate", onRelease, { capture: true, once: true });
      window.history.back();
    });
    return releaseInProgress.current;
  }, []);

  useEffect(() => {
    if (!dirty) {
      void release();
      return;
    }

    let active = true;
    let restoringAfterBack = false;

    function installEntry() {
      if (!active || hasGuardEntry()) return;
      window.history.pushState(
        { ...window.history.state, masanaoEditorGuard: window.location.href },
        "",
        window.location.href,
      );
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (allowLeave.current) return;
      event.preventDefault();
    }

    function handleLink(event: MouseEvent) {
      if (
        allowLeave.current || event.defaultPrevented || event.button !== 0 ||
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

    function handleBack(event: PopStateEvent) {
      if (allowLeave.current) return;
      if (hasGuardEntry()) {
        if (restoringAfterBack) {
          restoringAfterBack = false;
          event.stopImmediatePropagation();
          requestExit({ kind: "back" });
        }
        return;
      }

      event.stopImmediatePropagation();
      restoringAfterBack = true;
      window.history.forward();
    }

    if (releaseInProgress.current) void releaseInProgress.current.then(installEntry);
    else installEntry();
    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("popstate", handleBack, true);
    document.addEventListener("click", handleLink, true);
    return () => {
      active = false;
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("popstate", handleBack, true);
      document.removeEventListener("click", handleLink, true);
    };
  }, [dirty, release]);

  function dismissExit() {
    setExitRequest(null);
  }

  async function confirmExit(discard: () => void) {
    if (pending) return;
    dismissExit();
    if (exitRequest?.kind === "back" && window.history.length > 2) {
      allowLeave.current = true;
      window.history.go(-2);
      return;
    }

    await release();
    if (exitRequest?.kind === "link") router.push(exitRequest.href);
    else discard();
  }

  return { exitRequest, dismissExit, confirmExit, release };
}
