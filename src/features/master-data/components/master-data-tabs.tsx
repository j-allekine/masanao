"use client";

import type { ReactNode } from "react";

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
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value && isEnabledMasterDataTab(value)) onTabChange(value);
      }}
      className="gap-6"
    >
      <TabsList
        variant="line"
        aria-label="Master Data sections"
        className="w-full justify-start overflow-x-auto rounded-none border-b p-0"
      >
        {masterDataTabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className="min-h-10 flex-none rounded-none px-3"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
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
