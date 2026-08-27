import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder mirroring the vehicle table shape. */
export function VehicleTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border" aria-hidden>
      <div className="min-w-[640px] space-y-2 p-3">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
