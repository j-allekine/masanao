"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import WorkspaceHeader from "@/components/workspace/workspace-header";
import { cn } from "@/lib/utils";

import styles from "./workspace-layout.module.css";

type WorkspaceLayoutProps = ComponentPropsWithoutRef<"div"> & {
  workspaceTitle: string;
  task?: ReactNode;
};

export default function WorkspaceLayout({
  workspaceTitle,
  task,
  children,
  className,
  ...props
}: WorkspaceLayoutProps) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const chrome = chromeRef.current;
    const body = bodyRef.current;
    if (!layout || !chrome || !body) return;

    const measureChrome = () => {
      layout.style.setProperty("--workspace-chrome-height", `${chrome.getBoundingClientRect().height}px`);
    };
    measureChrome();
    const observer = new ResizeObserver(measureChrome);
    observer.observe(chrome, { box: "border-box" });

    let focusFrame = 0;
    function revealFocus(event: FocusEvent) {
      if (!(event.target instanceof HTMLElement)) return;
      const target = event.target;
      cancelAnimationFrame(focusFrame);
      // Browsers can leave a focused element beneath sticky content if its
      // position is already within the document viewport.
      focusFrame = requestAnimationFrame(() => {
        if (target !== document.activeElement) return;
        const clearance = Number.parseFloat(getComputedStyle(target).scrollMarginBlockStart);
        if (target.getBoundingClientRect().top < clearance) {
          target.scrollIntoView({ block: "start", inline: "nearest" });
        }
      });
    }
    body.addEventListener("focusin", revealFocus);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(focusFrame);
      body.removeEventListener("focusin", revealFocus);
    };
  }, []);

  return (
    <div
      {...props}
      ref={layoutRef}
      data-slot="workspace-layout"
      className={cn(styles.layout, "flex min-h-svh min-w-0 flex-col bg-card", className)}
    >
      <div ref={chromeRef} data-slot="workspace-chrome" className="sticky top-0 z-20 shrink-0 bg-card">
        <WorkspaceHeader title={workspaceTitle} />
        {task}
      </div>
      <div ref={bodyRef} data-slot="workspace-body" className={cn(styles.body, "flex min-w-0 flex-1 flex-col")}>
        {children}
      </div>
    </div>
  );
}

export function WorkspaceTaskHeader({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header data-slot="workspace-task-header" className="border-b">
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-auto flex-wrap items-center gap-x-2 gap-y-1 [overflow-wrap:anywhere]">
          {children}
        </div>
        {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
