"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type RecordFact = { label: string; value: ReactNode };

export function RecordFacts({ fields }: { fields: RecordFact[] }) {
  return <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(({ label, value }) => <div key={label} className="min-w-0"><dt className="text-label text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-body-sm">{value}</dd></div>)}</dl>;
}

/** Callers choose useful fields; empty groups have no disclosure or container. */
export function RecordDetails({ fields, label = "Additional details", disabled = false }: { fields: RecordFact[]; label?: string; disabled?: boolean }) {
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!fields.length) return null;
  return <Collapsible className="min-w-0"><CollapsibleTrigger disabled={disabled || !hydrated} render={<Button variant="ghost" className="px-0" />}>
    {label}<ChevronDown data-icon="inline-end" aria-hidden="true" />
  </CollapsibleTrigger><CollapsibleContent className="pt-2 pb-3"><RecordFacts fields={fields} /></CollapsibleContent></Collapsible>;
}
