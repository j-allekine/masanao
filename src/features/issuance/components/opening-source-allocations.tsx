import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBudgetMoney } from "@/features/supply-operations/domain/budget-variance";
import { formatDisplayNumber } from "@/lib/format-display-number";
import type { IssuanceReviewItem } from "../types";

/** Opening source details come from frozen issuance evidence, not current stock. */
export default function OpeningSourceAllocations({ row }: { row: IssuanceReviewItem | undefined }) {
  const allocations = row?.openingAllocations ?? [];
  if (!allocations.length) return null;
  return <section className="flex flex-col gap-3" aria-label="Opening Stock sources">
    <h3 className="font-medium">Opening Stock sources</h3>
    <p className="text-body-sm text-muted-foreground">Opening Stock is used before subsequent delivery receipts. Lines follow recorded count order because original purchase chronology is unknown. This allocation convention does not prove physical picking order.</p>
    <ul className="flex flex-col divide-y sm:hidden" aria-label="Opening Stock allocations">{allocations.map((allocation) => <li key={allocation.sourceId} className="flex min-w-0 flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-medium">{allocation.reference}{allocation.linePosition !== undefined && ` · Line ${allocation.linePosition + 1}`}</p><p className="text-body-sm text-muted-foreground">Count date: {allocation.countDate}</p></div><p className="max-w-1/3 shrink-0 break-all text-right text-body-sm tabular-nums">{formatDisplayNumber(allocation.quantity)} {row?.baseUnitAbbreviation}</p></div>
      <p className="text-body-sm text-muted-foreground">Issued supply cost: <span className="tabular-nums">{formatBudgetMoney(allocation.costCentavos)}</span></p>
    </li>)}</ul>
    <div className="hidden sm:block"><Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Count date</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Issued supply cost</TableHead></TableRow></TableHeader><TableBody>{allocations.map((allocation) => <TableRow key={allocation.sourceId}>
      <TableCell className="whitespace-normal break-words">{allocation.reference}{allocation.linePosition !== undefined && ` · Line ${allocation.linePosition + 1}`}</TableCell><TableCell>{allocation.countDate}</TableCell><TableCell className="whitespace-normal break-all text-right tabular-nums">{formatDisplayNumber(allocation.quantity)} {row?.baseUnitAbbreviation}</TableCell><TableCell className="whitespace-normal break-all text-right tabular-nums">{formatBudgetMoney(allocation.costCentavos)}</TableCell>
    </TableRow>)}</TableBody></Table></div>
  </section>;
}
