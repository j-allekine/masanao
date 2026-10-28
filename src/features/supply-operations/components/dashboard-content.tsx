"use client";

import { useEffect, useRef, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import WorkspaceHeader from "@/components/workspace/workspace-header";
import WorkspaceShell, { type WorkspaceUser } from "@/components/workspace/workspace-shell";
import type { DashboardResult } from "../dashboard-types";
import DashboardPeriodPicker from "./dashboard-period-picker";
import DashboardBudgetReport from "./dashboard-budget-report";

const subscribeHydration = () => () => {};
const timeLabel = (date: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(date));

export default function KitchenDashboard({ user, result }: { user: WorkspaceUser; result: DashboardResult }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const report = result.ok ? result.report : null;
  const period = result.ok ? result.report.period : result.period;
  const restoreSearchFocus = useRef(false);
  const disabled = !hydrated || pending;

  useEffect(() => {
    if (!pending && restoreSearchFocus.current) {
      document.getElementById("dashboard-activity-search")?.focus();
      restoreSearchFocus.current = false;
    }
  }, [pending]);

  function navigate(updates: { budgetPage?: number; start?: string; end?: string; activitySearch?: string }) {
    const query = new URLSearchParams({ start: updates.start ?? period.start, end: updates.end ?? period.end });
    const page = updates.budgetPage ?? report?.budgets.page ?? 1;
    if (page > 1) query.set("budgetPage", String(page));
    const search = updates.activitySearch ?? report?.budgets.search ?? "";
    if (search) query.set("activitySearch", search);
    startTransition(() => router.push(`/dashboard?${query}`, { scroll: false }));
  }

  return <WorkspaceShell user={user} activeSection="overview">
    <div className="flex min-h-svh min-w-0 flex-col bg-card" data-dashboard-surface>
      <div className="sticky top-0 z-10 border-b bg-card" data-dashboard-header>
        <WorkspaceHeader title="Dashboard" />
        <header className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-heading-1 font-semibold">Budget accounting</h1>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <DashboardPeriodPicker period={period} disabled={disabled} onApply={(next) => navigate({ ...next, budgetPage: 1 })} />
            <Button variant="outline" disabled={disabled} onClick={() => startTransition(() => router.refresh())}><RefreshCw data-icon="inline-start" aria-hidden="true" />{pending ? "Updating…" : "Refresh"}</Button>
          </div>
        </header>
      </div>
      <div className="mx-auto flex w-full min-w-0 max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6" aria-busy={pending} data-dashboard-ready={hydrated ? "true" : undefined}>
        {!result.ok ? <Alert variant="destructive"><AlertTitle>Report unavailable</AlertTitle><AlertDescription>{result.error}</AlertDescription></Alert> : report && <>
          {report.sampleData && <Alert data-dashboard-sample><AlertTitle>Sample data (preview only)</AlertTitle></Alert>}
          <DashboardBudgetReport key={`${period.start}/${period.end}/${report.budgets.search}`} report={report.budgets} disabled={disabled}
            onPageChange={(budgetPage) => navigate({ budgetPage })}
            onSearch={(activitySearch) => { restoreSearchFocus.current = true; navigate({ activitySearch, budgetPage: 1 }); }} />
          <footer className="flex min-w-0 flex-col gap-2 text-label text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="sm" />}><Info data-icon="inline-start" aria-hidden="true" />Report notes</PopoverTrigger>
              <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] gap-3 p-4">
                <PopoverHeader><PopoverTitle>About this report</PopoverTitle></PopoverHeader>
                <p>Variance = Planned budget − Issued supply cost. Positive is under budget; negative is over budget. Costs are to date, not final savings or profit.</p>
                <p>Activities are selected by scheduled date. Full budgets are compared with all their posted supply costs through the period end in Manila. Current budgets are not frozen historical submissions.</p>
                <p>Supply costs use allocated receipt amounts, rounded cumulatively to centavos. They exclude labor, utilities and other unrecorded costs.</p>
              </PopoverContent>
            </Popover>
            <p data-dashboard-updated className="sm:w-80 sm:text-right">Updated <time dateTime={report.generatedAt}>{timeLabel(report.generatedAt)}</time> · Manila</p>
          </footer>
        </>}
      </div>
    </div>
  </WorkspaceShell>;
}
