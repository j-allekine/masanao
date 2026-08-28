import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewLoading() {
  return (
    <main
      aria-label="Loading Masanao overview"
      className="min-h-svh bg-background px-6 py-8 sm:px-10"
    >
      <div className="mx-auto flex w-full max-w-masanao-content flex-col gap-8">
        <div className="flex items-center justify-between border-b pb-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
