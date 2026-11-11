"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import WorkspaceHeader from "@/components/workspace/workspace-header";
import { cn } from "@/lib/utils";

import styles from "./workspace-layout.module.css";

type WorkspaceLayoutProps = ComponentPropsWithoutRef<"div"> & {
  workspaceTitle: string;
  task?: ReactNode;
  mode?: "document" | "bounded";
  footer?: ReactNode;
};

export default function WorkspaceLayout({
  workspaceTitle,
  task,
  mode = "document",
  footer,
  children,
  className,
  ...props
}: WorkspaceLayoutProps) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const hasFooter = Boolean(footer);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const chrome = chromeRef.current;
    const body = bodyRef.current;
    if (!layout || !chrome || !body) return;

    const footerElement = footerRef.current;
    const measureChrome = () => {
      const chromeHeight = chrome.getBoundingClientRect().height;
      const footerHeight = footerElement?.getBoundingClientRect().height ?? 0;
      // When the header and actions leave too little working room, let all regions scroll.
      const enoughRoom = window.innerHeight - chromeHeight - footerHeight >= 112;
      const flowRecordChrome =
        !enoughRoom && chrome.querySelector('[data-slot="workspace-record-title"]') !== null;
      layout.toggleAttribute("data-bounded-scroll", mode === "bounded" && enoughRoom);
      layout.toggleAttribute("data-flow-scroll", flowRecordChrome);
      layout.style.setProperty("--workspace-chrome-height", flowRecordChrome ? "0px" : `${chromeHeight}px`);
    };
    measureChrome();
    const observer = new ResizeObserver(measureChrome);
    observer.observe(chrome, { box: "border-box" });
    if (footerElement) observer.observe(footerElement, { box: "border-box" });
    window.addEventListener("resize", measureChrome);

    let focusFrame = 0;
    const revealFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const target = event.target;
      cancelAnimationFrame(focusFrame);
      // Browsers can leave a focused element beneath sticky content if its
      // position is already within the document viewport.
      focusFrame = requestAnimationFrame(() => {
        if (target !== document.activeElement) return;
        const clearance = Number.parseFloat(getComputedStyle(target).scrollMarginBlockStart);
        const viewportTop = layout.hasAttribute("data-bounded-scroll")
          ? body.getBoundingClientRect().top
          : 0;
        if (target.getBoundingClientRect().top < viewportTop + clearance) {
          target.scrollIntoView({ block: "start", inline: "nearest" });
        }
      });
    };
    body.addEventListener("focusin", revealFocus);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureChrome);
      cancelAnimationFrame(focusFrame);
      body.removeEventListener("focusin", revealFocus);
    };
  }, [mode, hasFooter]);

  return (
    <div
      {...props}
      ref={layoutRef}
      data-slot="workspace-layout"
      data-bounded-scroll={mode === "bounded" ? true : undefined}
      className={cn(
        styles.layout,
        "flex min-h-svh min-w-0 flex-col bg-card",
        className,
      )}
    >
      <div ref={chromeRef} data-slot="workspace-chrome" className={cn(styles.chrome, "top-0 z-20 shrink-0 bg-card")}>
        <WorkspaceHeader title={workspaceTitle} />
        {task}
      </div>
      <div ref={bodyRef} data-slot="workspace-body" className={cn(styles.body, "flex min-w-0 flex-1 flex-col")}>
        {children}
      </div>
      {footer && (
        <footer ref={footerRef} className="shrink-0 border-t bg-card px-4 py-2 sm:px-6">
          {footer}
        </footer>
      )}
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
      <div className="mx-auto flex min-h-13 w-full max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-auto flex-wrap items-center gap-x-2 gap-y-1 [overflow-wrap:anywhere]">
          {children}
        </div>
        {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function WorkspaceRecordTitle({ title }: { title: string }) {
  return (
    <h1
      data-slot="workspace-record-title"
      className="min-w-[min(100%,14ch)] flex-1 text-heading-3 font-semibold wrap-anywhere"
    >
      {title}
    </h1>
  );
}
