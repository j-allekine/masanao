"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkspaceLayout, { WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";

import {
  isEnabledMasterDataTab,
  masterDataTabs,
  type MasterDataTab,
} from "./master-data-list-state";

export default function MasterDataTabs({
  activeTab,
  onTabChange,
  actions,
  children,
}: {
  activeTab: MasterDataTab;
  onTabChange: (tab: MasterDataTab) => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (value && isEnabledMasterDataTab(value)) onTabChange(value);
      }}
      className="min-w-0"
    >
      <WorkspaceLayout
        workspaceTitle="Master Data"
        task={
          <WorkspaceTaskHeader actions={actions}>
            <h1 className="sr-only">Master Data</h1>
            <TabsList
              aria-label="Master Data sections"
              className="min-h-8 max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto"
            >
              {masterDataTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  disabled={tab.disabled}
                  className="min-h-7 max-w-full flex-none px-2 whitespace-normal"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </WorkspaceTaskHeader>
        }
      >
        <div className="mx-auto w-full min-w-0 max-w-content px-4 py-6 sm:px-6">
          {children}
        </div>
      </WorkspaceLayout>
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
