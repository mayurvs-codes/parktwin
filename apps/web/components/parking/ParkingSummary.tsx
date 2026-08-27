import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { OccupancyDTO } from "@/types/dashboard";
import { formatNumber, formatPercent } from "@/lib/format";

export interface ParkingSummaryProps {
  /** Backend occupancy snapshot (consumed verbatim — no frontend math). */
  occupancy: OccupancyDTO | null;
  isLoading?: boolean;
}

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}

function Stat({ label, value, hint, tone }: StatProps) {
  return (
    <div className="flex min-w-[5rem] flex-col">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</span>
      {hint && <span className="text-xs text-muted-foreground/80">{hint}</span>}
    </div>
  );
}

/**
 * Parking summary panel. Reuses the backend `OccupancyDTO` verbatim: Total
 * Slots, Occupied, Available (the gateway's `free` count), and Occupancy %.
 * No values are computed on the frontend — only presentation formatting.
 */
export function ParkingSummary({ occupancy, isLoading }: ParkingSummaryProps) {
  const total = occupancy?.total_slots ?? 0;
  const occupied = occupancy?.occupied ?? 0;
  const available = occupancy?.free ?? 0;
  const rate = occupancy?.occupancy_rate ?? 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
        {isLoading && !occupancy ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner size={18} label="Loading parking summary" />
            Loading summary…
          </span>
        ) : (
          <>
            <Stat label="Total Slots" value={formatNumber(total)} />
            <Stat
              label="Occupied"
              value={formatNumber(occupied)}
              tone="text-rose-600 dark:text-rose-400"
            />
            <Stat
              label="Available"
              value={formatNumber(available)}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <Stat label="Occupancy" value={formatPercent(rate)} hint="of capacity" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
