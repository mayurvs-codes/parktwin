"use client";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useOccupancy, useStatistics, useVehicles } from "@/hooks/useDashboard";
import { formatNumber, formatPercent, isToday } from "@/lib/format";
import type { KpiItem } from "@/types/dashboard";

/** Occupancy-rate thresholds that flip the KPI's semantic tone. */
function occupancyTone(rate: number): NonNullable<KpiItem["tone"]> {
  if (rate >= 90) return "destructive";
  if (rate >= 75) return "warning";
  return "success";
}

function KpiSkeletonGrid() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden
      data-testid="kpi-skeleton"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] w-full rounded-lg" />
      ))}
    </div>
  );
}

/**
 * KPI card grid — the top row of the dashboard.
 *
 * Pulls occupancy + statistics from the gateway and derives the six required
 * tiles. "Today's Vehicles" is a presentation count over the vehicle list
 * (vehicles first seen / last seen today) — the heavy aggregates (occupancy
 * rate, session counts) are computed backend-side.
 */
export function KpiCardGrid() {
  const occupancy = useOccupancy();
  const statistics = useStatistics();
  const vehicles = useVehicles();

  const isLoading = occupancy.isLoading || statistics.isLoading || vehicles.isLoading;
  const isError = occupancy.isError || statistics.isError || vehicles.isError;

  if (isLoading) return <KpiSkeletonGrid />;

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load KPIs"
        description="The parking intelligence service may be unavailable."
        onRetry={() => {
          void occupancy.refetch();
          void statistics.refetch();
          void vehicles.refetch();
        }}
      />
    );
  }

  const occ = occupancy.data;
  const stats = statistics.data;
  const rate = occ?.occupancy_rate ?? 0;
  const todaysVehicles = (vehicles.data ?? []).filter(
    (v) => isToday(v.created_at) || isToday(v.last_seen)
  ).length;

  const items: KpiItem[] = [
    {
      key: "total",
      label: "Total Parking Slots",
      value: formatNumber(occ?.total_slots ?? 0),
      hint: "across all cameras",
      icon: "slots",
      tone: "default",
    },
    {
      key: "occupied",
      label: "Occupied Slots",
      value: formatNumber(occ?.occupied ?? 0),
      hint: `${formatNumber(occ?.free ?? 0)} available`,
      icon: "occupied",
      tone: "warning",
    },
    {
      key: "available",
      label: "Available Slots",
      value: formatNumber(occ?.free ?? 0),
      hint: `${formatNumber(occ?.reserved ?? 0)} reserved`,
      icon: "available",
      tone: "success",
    },
    {
      key: "sessions",
      label: "Active Parking Sessions",
      value: formatNumber(stats?.active_sessions ?? 0),
      hint: `${formatNumber(stats?.total_sessions ?? 0)} total`,
      icon: "sessions",
      tone: "default",
    },
    {
      key: "today",
      label: "Today's Vehicles",
      value: formatNumber(todaysVehicles),
      hint: "detected today",
      icon: "vehicles",
      tone: "default",
    },
    {
      key: "occupancy",
      label: "Occupancy Percentage",
      value: formatPercent(rate),
      hint: `${formatNumber(occ?.occupied ?? 0)} of ${formatNumber(occ?.total_slots ?? 0)}`,
      icon: "percent",
      tone: occupancyTone(rate),
    },
  ];

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Key parking metrics"
    >
      {items.map((item) => (
        <div role="listitem" key={item.key}>
          <KpiCard item={item} />
        </div>
      ))}
    </div>
  );
}
