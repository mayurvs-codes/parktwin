"use client";

import { LayoutGrid } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsChart, ChartSkeleton } from "./AnalyticsChart";
import { formatNumber } from "@/lib/format";
import type { OccupancyAnalyticsDTO, UtilizationAnalyticsDTO } from "@/types/analytics";

interface UtilizationChartProps {
  occupancy: OccupancyAnalyticsDTO | undefined;
  utilization: UtilizationAnalyticsDTO | undefined;
  isLoading?: boolean;
}

/** Slot-state donut + most/least used slots (backend-computed). */
export function UtilizationChart({ occupancy, utilization, isLoading }: UtilizationChartProps) {
  const donutData = [
    { name: "Occupied", value: occupancy?.current_occupancy ?? 0, color: "#ef4444" },
    { name: "Available", value: occupancy?.free_slots ?? 0, color: "#22c55e" },
    { name: "Reserved", value: occupancy?.reserved_slots ?? 0, color: "#f59e0b" },
    { name: "Unknown", value: occupancy?.unknown_slots ?? 0, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const mostUsed = (utilization?.most_used_slots ?? []).map((s) => ({
    slot: String(s.slot_id),
    usage: s.usage_count,
  }));
  const leastUsed = (utilization?.least_used_slots ?? []).slice(0, 5);

  const hasData = donutData.length > 0 || mostUsed.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilization</CardTitle>
        <CardDescription>Slot state distribution and usage ranking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={LayoutGrid}
            title="No utilization data"
            description="Slot usage will appear once parking sessions are recorded."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Slot state</p>
              <AnalyticsChart
                kind="donut"
                data={donutData}
                height={240}
                showLegend
                ariaLabel="Slot state distribution"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Most used slots</p>
              {mostUsed.length > 0 ? (
                <AnalyticsChart
                  kind="bar"
                  data={mostUsed}
                  xKey="slot"
                  height={240}
                  ariaLabel="Most used slots by session count"
                  series={[{ key: "usage", name: "Sessions" }]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No slot usage recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {leastUsed.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Least used slots</p>
            <ul className="flex flex-wrap gap-2">
              {leastUsed.map((s) => (
                <li
                  key={String(s.slot_id)}
                  className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground">{String(s.slot_id)}</span>
                  {" · "}
                  {formatNumber(s.usage_count)} session{s.usage_count === 1 ? "" : "s"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
