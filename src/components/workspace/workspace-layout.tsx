"use client";

import { Expand } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
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

    const focusViewport = mode === "bounded" ? body : null;
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
        const viewportTop = focusViewport?.getBoundingClientRect().top ?? 0;
        if (target.getBoundingClientRect().top < viewportTop + clearance) {
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
  }, [mode]);

  return (
    <div
      {...props}
      ref={layoutRef}
      data-slot="workspace-layout"
      className={cn(
        styles.layout,
        mode === "bounded" && styles.bounded,
        "flex min-h-svh min-w-0 flex-col bg-card",
        className,
      )}
    >
      <div ref={chromeRef} data-slot="workspace-chrome" className="sticky top-0 z-20 shrink-0 bg-card">
        <WorkspaceHeader title={workspaceTitle} />
        {task}
      </div>
      <div ref={bodyRef} data-slot="workspace-body" className={cn(styles.body, "flex min-w-0 flex-1 flex-col")}>
        {children}
      </div>
      {footer && (
        <footer className="shrink-0 border-t bg-card px-4 py-2 sm:px-6">
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
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-auto flex-wrap items-center gap-x-2 gap-y-1 [overflow-wrap:anywhere]">
          {children}
        </div>
        {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Keep the heading compact while making the complete record name available on demand. */
export function WorkspaceRecordTitle({ title }: { title: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [clipped, setClipped] = useState(false);

  useLayoutEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const measure = () => setClipped(heading.scrollHeight > heading.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(heading);
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [title]);

  return (
    <div className="flex min-w-0 flex-[1_1_14ch] items-center gap-1">
      <h1 ref={headingRef} className="line-clamp-2 min-w-0 text-heading-3 font-semibold wrap-anywhere">
        {title}
      </h1>
      {clipped && (
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="Show full title" />}>
            <Expand aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent align="start" className="max-h-[min(14rem,50svh)] max-w-[calc(100vw-2rem)] overflow-y-auto">
            <PopoverTitle className="wrap-anywhere">{title}</PopoverTitle>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
