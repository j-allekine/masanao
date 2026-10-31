"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Registration = { dirty: boolean; pending: boolean; ask: (leave: () => void) => void };
type GuardOwner = { register: (guard: Registration) => () => void; request: (leave: () => void) => void };
const NavigationGuardContext = createContext<GuardOwner | null>(null);
const HISTORY_KEY = "masanaoNavigation";
type Entry = { session: string; index: number };

function readEntry(state: unknown): Entry | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as Record<string, unknown>)[HISTORY_KEY];
  if (!value || typeof value !== "object") return null;
  const candidate = value as Entry;
  return typeof candidate.session === "string" && candidate.session.length > 0 && Number.isSafeInteger(candidate.index) ? candidate : null;
}

function entry(state: unknown, session: string) {
  const candidate = readEntry(state);
  return candidate?.session === session ? candidate : null;
}

/** Persistent root owner. History contains an index only, never form or record data. */
export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const active = useRef<Registration | null>(null);
  const register = useCallback((guard: Registration) => {
    active.current = guard;
    return () => { if (active.current === guard) active.current = null; };
  }, []);
  const request = useCallback((leave: () => void) => {
    const guard = active.current;
    if (guard?.pending) return;
    if (guard?.dirty) guard.ask(leave);
    else leave();
  }, []);

  useEffect(() => {
    const existing = readEntry(window.history.state);
    const session = existing?.session ?? crypto.randomUUID();
    let currentIndex = existing?.index ?? 0;
    let installed = true;
    let restoring: { index: number; after: () => void } | null = null;
    let replaying = false;
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    const indexed = (data: unknown, index: number) => ({ ...(data && typeof data === "object" ? data : {}), [HISTORY_KEY]: { session, index } });
    // Additive metadata only: preserve Next's tree and all existing history entries.
    originalReplace.call(window.history, indexed(window.history.state, currentIndex), "");
    const push: History["pushState"] = function(this: History, data, unused, url) {
      if (!installed) return originalPush.call(this, data, unused, url);
      currentIndex += 1;
      return originalPush.call(this, indexed(data, currentIndex), unused, url);
    };
    const replace: History["replaceState"] = function(this: History, data, unused, url) {
      if (!installed) return originalReplace.call(this, data, unused, url);
      return originalReplace.call(this, indexed(data, currentIndex), unused, url);
    };
    window.history.pushState = push;
    window.history.replaceState = replace;

    function traverse(event: PopStateEvent) {
      const destination = entry(event.state, session);
      if (restoring) {
        if (destination?.index === restoring.index) {
          event.stopImmediatePropagation();
          const after = restoring.after;
          restoring = null;
          after();
        }
        return;
      }
      if (replaying) { replaying = false; if (destination) currentIndex = destination.index; return; }
      const guard = active.current;
      // Pre-initialization and cross-document entries cannot be rolled back safely.
      // Let the browser own these rather than replacing a destination or erasing Forward.
      if (!destination) return;
      const delta = destination.index - currentIndex;
      if (!delta || (!guard?.dirty && !guard?.pending)) { currentIndex = destination.index; return; }
      event.stopImmediatePropagation();
      const pendingAtRequest = guard.pending;
      restoring = { index: currentIndex, after: () => {
        if (active.current !== guard || pendingAtRequest || guard.pending) return;
        guard.ask(() => { replaying = true; window.history.go(delta); });
      } };
      window.history.go(-delta);
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href);
      if (target.origin !== location.origin || target.pathname === "/" || target.pathname.startsWith("/api/auth/") || anchor.dataset.navigationGuard === "bypass") return;
      if (target.pathname === location.pathname && target.search === location.search) return;
      if (!active.current?.dirty && !active.current?.pending) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      request(() => router.push(`${target.pathname}${target.search}${target.hash}`));
    }
    function unload(event: BeforeUnloadEvent) {
      if (!active.current?.dirty && !active.current?.pending) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("popstate", traverse, true);
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", unload);
    return () => {
      installed = false;
      window.removeEventListener("popstate", traverse, true);
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", unload);
      if (window.history.pushState === push) window.history.pushState = originalPush;
      if (window.history.replaceState === replace) window.history.replaceState = originalReplace;
    };
  }, [request, router]);

  return <NavigationGuardContext.Provider value={{ register, request }}>{children}</NavigationGuardContext.Provider>;
}

/** The feature retains form state, dialog content, and successful navigation.
 * complete() is terminal for this mounted form: use only when leaving after save
 * or discard. Save-in-place must update the feature's saved baseline and dirty
 * prop instead, so subsequent edits retain protection.
 */
export function useUnsavedNavigation({ dirty, pending }: { dirty: boolean; pending: boolean }) {
  const owner = useContext(NavigationGuardContext);
  if (!owner) throw new Error("useUnsavedNavigation requires NavigationGuardProvider");
  const { register, request } = owner;
  const [open, setOpen] = useState(false);
  const leave = useRef<(() => void) | null>(null);
  const completed = useRef(false);
  const guard = useRef<Registration>({ dirty, pending, ask: () => {} });
  useLayoutEffect(() => {
    guard.current.dirty = completed.current ? false : dirty;
    guard.current.pending = completed.current ? false : pending;
    guard.current.ask = callback => { leave.current = callback; setOpen(true); };
  }, [dirty, pending]);
  useEffect(() => register(guard.current), [register]);
  function onStay() { leave.current = null; setOpen(false); }
  function complete(callback: () => void) {
    completed.current = true;
    guard.current.dirty = false;
    guard.current.pending = false;
    leave.current = null;
    setOpen(false);
    callback();
  }
  function onDiscard() {
    if (guard.current.pending) return;
    const callback = leave.current;
    if (callback) complete(callback);
  }
  return { requestLeave: request, complete, open, onStay, onDiscard };
}

