import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceTableSkeleton({
  columnLabels,
  rowCount = 5,
}: {
  columnLabels: string[];
  rowCount?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table aria-label="Loading table" className="w-full min-w-[40rem]">
        <thead className="sr-only">
          <tr>
            {columnLabels.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-b-0">
              {columnLabels.map((label, columnIndex) => (
                <td key={label} className="px-4 py-4">
                  <Skeleton
                    aria-label={`Loading ${label}`}
                    className={columnIndex === 0 ? "h-4 w-24" : "h-4 w-full max-w-40"}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
