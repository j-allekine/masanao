"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  isEnabledMasterDataTab,
  masterDataTabs,
  type MasterDataTab,
} from "./master-data-list-state";

export default function MasterDataTabs({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: MasterDataTab;
  onTabChange: (tab: MasterDataTab) => void;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function revealTab(tab: HTMLElement) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const bounds = scroller.getBoundingClientRect();
    const target = tab.getBoundingClientRect();
    if (target.left < bounds.left + 4) scroller.scrollLeft += target.left - bounds.left - 4;
    else if (target.right > bounds.right - 4) scroller.scrollLeft += target.right - bounds.right + 4;
  }

  useEffect(() => {
    const tab = scrollerRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (tab) revealTab(tab);
  }, [activeTab]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value && isEnabledMasterDataTab(value)) onTabChange(value);
      }}
      className="gap-6"
    >
      <div ref={scrollerRef} className="min-w-0 overflow-x-auto px-1 py-2">
        <TabsList
          variant="line"
          aria-label="Master Data sections"
          className="min-w-full justify-start rounded-none border-b p-0 group-data-horizontal/tabs:h-auto"
        >
          {masterDataTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              className="h-auto min-h-10 flex-none rounded-none px-3 after:bottom-0"
              onFocus={(event) => revealTab(event.currentTarget)}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}

export function MasterDataTabContent({
  value,
  children,
}: {
  value: MasterDataTab;
  children: ReactNode;
}) {
  return (
    <TabsContent value={value} className="flex flex-col gap-0">
      {children}
    </TabsContent>
  );
}
