import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder mirroring the report history table shape. */
export function ReportTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border" aria-hidden>
      <div className="min-w-[760px] space-y-2 p-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
