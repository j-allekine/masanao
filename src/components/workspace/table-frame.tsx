"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import styles from "./table-frame.module.css";

export default function WorkspaceTableFrame({
  caption,
  className,
  children,
  stickyColumns = false,
}: {
  caption: string;
  className?: string;
  children: ReactNode;
  stickyColumns?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const table = frame?.querySelector("table");
    const labels = table?.tHead;
    const layout = frame?.closest('[data-slot="workspace-layout"]');
    const chrome = layout?.querySelector('[data-slot="workspace-chrome"]');
    if (!stickyColumns || !frame || !table || !labels || !layout || !chrome) return;

    // The Table primitive pans horizontally. Moving the actual header within
    // that wrapper keeps native columns aligned as the document scrolls.
    let offset = 0;
    const positionLabels = () => {
      const bounds = labels.getBoundingClientRect();
      const naturalTop = bounds.top - offset;
      const tableEnd = table.getBoundingClientRect().bottom;
      const chromeEnd = chrome.getBoundingClientRect().bottom;
      const nextOffset = Math.max(0, Math.min(chromeEnd - naturalTop, tableEnd - naturalTop - bounds.height));
      if (nextOffset !== offset) {
        offset = nextOffset;
        labels.style.setProperty("--workspace-column-label-offset", `${offset}px`);
      }
    };

    const observer = new ResizeObserver(() => {
      frame.style.setProperty("--workspace-column-label-height", `${labels.getBoundingClientRect().height}px`);
      positionLabels();
    });
    observer.observe(labels, { box: "border-box" });
    observer.observe(table, { box: "border-box" });
    observer.observe(layout, { box: "border-box" });
    observer.observe(chrome, { box: "border-box" });
    positionLabels();
    window.addEventListener("scroll", positionLabels, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", positionLabels);
      frame.style.removeProperty("--workspace-column-label-height");
      labels.style.removeProperty("--workspace-column-label-offset");
    };
  }, [stickyColumns]);

  return (
    <div ref={frameRef} className={cn("rounded-xl border bg-card shadow-xs", stickyColumns && styles.stickyColumns)}>
      <Table className={className}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </Table>
    </div>
  );
}
