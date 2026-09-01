import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function WorkspaceTableSkeleton({
  columnLabels,
  rowCount = 5,
}: {
  columnLabels: string[];
  rowCount?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table aria-label="Loading table" className="min-w-[40rem]">
        <TableHeader className="sr-only">
          <TableRow>
            {columnLabels.map((label) => (
              <TableHead key={label} scope="col">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columnLabels.map((label, columnIndex) => (
                <TableCell key={label} className="px-4 py-4">
                  <Skeleton
                    aria-label={`Loading ${label}`}
                    className={columnIndex === 0 ? "h-4 w-24" : "h-4 w-full max-w-40"}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
