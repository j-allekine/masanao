"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { WorkspaceSearchField } from "@/components/workspace/catalog-controls";
import CatalogPagination from "@/components/workspace/catalog-pagination";
import { cn } from "@/lib/utils";
import type { DashboardBudgetActivity, DashboardBudgets } from "../dashboard-types";
import { formatBudgetMoney } from "../domain/budget-variance";

const money = (value: string | null, signed = false) => value === null ? "—" : formatBudgetMoney(value, signed);
const day = (value: string) => new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const varianceTone = (value: string | null) => value?.startsWith("-") ? "text-destructive" : value && BigInt(value) > BigInt(0) ? "text-primary" : undefined;

function CostNotes({ row }: { row: DashboardBudgetActivity }) {
  const notes = [row.cost === null && "Cost incomplete", row.pendingMeals > 0 && `${row.pendingMeals} ${row.pendingMeals === 1 ? "meal" : "meals"} not posted`, !row.mealCount && "No Meal Schedules", row.reconstructed && "Estimate from reconstructed sources"].filter(Boolean);
  return notes.length ? <p className="mt-1 text-label text-muted-foreground">{notes.join(" · ")}</p> : null;
}

export default function DashboardBudgetReport({ report, disabled, onPageChange, onSearch }: {
  report: DashboardBudgets; disabled: boolean; onPageChange: (page: number) => void; onSearch: (search: string) => void;
}) {
  const [search, setSearch] = useState(report.search);
  const router = useRouter();
  function openActivity(event: MouseEvent<HTMLElement>, href: string) {
    // The real name link owns keyboard/modifier navigation. Text stays selectable.
    if (disabled || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest("a,button,input")) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  }
  const available = report.summary.comparable > 0;
  const metrics = [
    { label: "Planned budget", value: report.summary.budget },
    { label: "Issued supply cost", value: report.summary.cost },
    { label: "Budget variance", value: report.summary.variance, signed: true },
  ];
  const facts = (row: DashboardBudgetActivity) => [
    { label: "Planned budget", value: row.budget === null ? "Not recorded" : money(row.budget) },
    { label: "Issued supply cost", value: money(row.cost) },
    { label: "Budget variance", value: money(row.variance, true) },
    { label: "Budget used", value: row.used ?? "—" },
  ];
  return <section aria-labelledby="budget-performance-title" className="flex min-w-0 flex-col gap-5">
    <div>
      <dl className="grid min-w-0 gap-5 py-1 sm:grid-cols-3 sm:gap-8">{metrics.map((metric) => <div key={metric.label} className="min-w-0">
        <dt className="text-body-sm text-muted-foreground">{metric.label}</dt>
        <dd className="mt-2 break-words text-heading-2 font-semibold tracking-tight tabular-nums"><span className={cn(metric.signed && available && varianceTone(metric.value))}>{available ? money(metric.value, metric.signed) : "—"}</span></dd>
      </div>)}</dl>
      <p className="mt-3 text-label text-muted-foreground">Costs to date{report.summary.excluded > 0 ? ` · ${report.summary.excluded} incomplete ${report.summary.excluded === 1 ? "Activity" : "Activities"} excluded from totals` : ""}</p>
      {report.summary.reconstructed && <p className="mt-1 text-label text-muted-foreground">Includes estimates from reconstructed receipt sources.</p>}
    </div>
    <Separator />
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <h2 id="budget-performance-title" className="text-heading-3 font-semibold">Activities</h2>
      <form className="w-full sm:max-w-sm" onSubmit={(event) => { event.preventDefault(); onSearch(search); }}>
        <FieldSet disabled={disabled}><FieldLegend className="sr-only">Find Activities</FieldLegend><FieldGroup className="flex-row items-end gap-2">
          <WorkspaceSearchField id="dashboard-activity-search" label="Search Activities by name or Office" placeholder="Activity or Office…" value={search} onValueChange={(value) => { setSearch(value); if (!value && report.search) onSearch(""); }} />
          <Button variant="outline" type="submit" disabled={disabled}>Search</Button>
        </FieldGroup></FieldSet>
      </form>
    </div>
    {!report.total ? <Empty className="min-h-52 rounded-lg border"><EmptyHeader><EmptyTitle>{report.search ? "No matching Activities" : "No Activities scheduled in this period"}</EmptyTitle><EmptyDescription>{report.search ? "Try another Activity or Office, or clear the search." : "Choose another period to compare budgets and issued supplies."}</EmptyDescription></EmptyHeader></Empty> : <>
      <div className="hidden min-w-0 lg:block">
        <WorkspaceTableFrame caption="Activity budget comparison">
          <TableHeader className="bg-muted/60"><TableRow><TableHead>Activity</TableHead><TableHead className="text-right">Planned budget</TableHead><TableHead className="text-right">Issued supply cost</TableHead><TableHead className="text-right">Budget variance</TableHead><TableHead className="text-right">Budget used</TableHead></TableRow></TableHeader>
          <TableBody>{report.rows.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={(event) => openActivity(event, row.href)}>
              <TableCell className="max-w-64 whitespace-normal py-3"><Link className="break-words font-medium text-primary underline-offset-4 hover:underline" href={row.href}>{row.name}</Link><p className="mt-1 break-words text-label text-muted-foreground">{row.office} · {day(row.date)}</p></TableCell>
              {facts(row).map((fact, index) => <TableCell key={fact.label} className={cn("max-w-40 break-words whitespace-normal text-right tabular-nums", index === 2 && ["font-semibold", varianceTone(row.variance)])}>
                {fact.value}{index === 1 && <CostNotes row={row} />}
              </TableCell>)}
            </TableRow>)}</TableBody>
        </WorkspaceTableFrame>
      </div>
      <div className="flex min-w-0 flex-col divide-y rounded-xl border px-4 lg:hidden" data-budget-mobile>{report.rows.map((row) => <article key={row.id} className="min-w-0 cursor-pointer py-4" onClick={(event) => openActivity(event, row.href)}>
        <Link className="break-words font-medium text-primary underline-offset-4 hover:underline" href={row.href}>{row.name}</Link><p className="mt-1 break-words text-label text-muted-foreground">{row.office} · {day(row.date)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-4">{facts(row).map((fact) => <div key={fact.label} className="min-w-0"><dt className="text-label text-muted-foreground">{fact.label}</dt><dd className={cn("mt-1 break-words font-medium tabular-nums", fact.label === "Budget variance" && varianceTone(row.variance))}>{fact.value}</dd></div>)}</dl>
        <CostNotes row={row} />
      </article>)}</div>
      <FieldSet disabled={disabled} className="min-w-0" aria-label="Activity budget pagination"><CatalogPagination page={report.page} pageCount={report.pageCount} total={report.total} start={(report.page - 1) * report.pageSize + 1} end={Math.min(report.page * report.pageSize, report.total)} onPageChange={onPageChange} /></FieldSet>
    </>}
  </section>;
}
