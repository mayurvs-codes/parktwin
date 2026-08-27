"use client";

import { Clock, Gauge, Car, Percent, TrendingUp, Users } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatHour, peakFromTimeline } from "./chart-utils";
import { formatNumber, formatPercent } from "@/lib/format";
import type { AnalyticsDashboardDTO, OccupancyTimelinePoint } from "@/types/analytics";

interface OverviewMetricsProps {
  dashboard: AnalyticsDashboardDTO | undefined;
  /** Windowed occupancy timeline (used only to surface the peak point). */
  occupancyTimeline: ReadonlyArray<OccupancyTimelinePoint>;
  isLoading?: boolean;
}

function OverviewSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden
      data-testid="analytics-metric-skeleton"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] w-full rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Overview metric tiles (Step 2). Every value is backend-provided — no metric
 * is computed on the frontend. "Peak Occupancy" selects the highest snapshot
 * from the returned timeline (display only, not an analytics calculation).
 */
export function OverviewMetrics({ dashboard, occupancyTimeline, isLoading }: OverviewMetricsProps) {
  if (isLoading) return <OverviewSkeleton />;

  const occupancy = dashboard?.occupancy;
  const traffic = dashboard?.traffic;
  const utilization = dashboard?.utilization;
  const peak = peakFromTimeline(occupancyTimeline);

  const cards = [
    {
      key: "avg-occupancy",
      label: "Average Occupancy",
      value: formatPercent(occupancy?.average_occupancy_percentage ?? 0),
      hint: "mean across cameras",
      icon: Percent,
      tone: "info" as const,
    },
    {
      key: "peak-occupancy",
      label: "Peak Occupancy",
      value: formatPercent(peak?.occupancy_percentage ?? occupancy?.occupancy_percentage ?? 0),
      hint: peak ? "peak in selected window" : "latest snapshot",
      icon: TrendingUp,
      tone: "warning" as const,
    },
    {
      key: "vehicle-count",
      label: "Vehicle Count",
      value: formatNumber(traffic?.vehicle_counts.total ?? 0),
      hint: `${formatNumber(traffic?.vehicle_counts.distinct ?? 0)} unique`,
      icon: Car,
      tone: "default" as const,
    },
    {
      key: "avg-duration",
      label: "Average Parking Duration",
      value: utilization?.average_parking_duration ?? "—",
      hint: "mean session length",
      icon: Clock,
      tone: "default" as const,
    },
    {
      key: "peak-hour",
      label: "Peak Hour",
      value: formatHour(traffic?.peak_hour ?? null),
      hint: `${formatNumber(traffic?.peak_hour_entries ?? 0)} entries`,
      icon: Users,
      tone: "info" as const,
    },
    {
      key: "slot-utilization",
      label: "Slot Utilization",
      value: formatPercent(utilization?.slot_utilization_percentage ?? 0),
      hint: `${formatNumber(utilization?.used_slots ?? 0)} of ${formatNumber(utilization?.total_slots ?? 0)} slots`,
      icon: Gauge,
      tone: "success" as const,
    },
  ];

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Analytics overview metrics"
    >
      {cards.map((card) => (
        <div role="listitem" key={card.key}>
          <MetricCard
            label={card.label}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            tone={card.tone}
          />
        </div>
      ))}
    </div>
  );
}
