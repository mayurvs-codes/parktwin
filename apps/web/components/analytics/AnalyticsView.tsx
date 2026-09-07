"use client";

import { useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { deriveMovieAnalytics } from "./movieAnalytics";
import { TimeRangeSelector, getDatesForRangeKey, type TimeRangeSelection } from "./TimeRangeSelector";
import { OverviewMetrics } from "./OverviewMetrics";
import { OccupancyTrend } from "./OccupancyTrend";
import { TrafficTrend } from "./TrafficTrend";
import { PeakUsage } from "./PeakUsage";
import { UtilizationChart } from "./UtilizationChart";
import { TimeBasedAnalysis } from "./TimeBasedAnalysis";

/**
 * Analytics View (Module 6 – Phase F + Shared Demo Movie Engine).
 *
 * Authoritatively synchronized with `useDemoMovieStore`:
 * - Exactly 60 total facility parking spaces.
 * - Occupancy percentage, occupied count, and available count track Live Parking and Digital Twin 1:1.
 * - Vehicle arrival, dwell duration, and exit counts reflect the movie lifecycle.
 * - Timeline charts show real-time movie progression up to `currentTime`.
 * - Freezes instantly when PAUSED.
 * - Resumes seamlessly when RESUMED.
 * - Resets to baseline (t=0: 20 occupied / 40 available) when PROJECT RESET is clicked.
 */
export function AnalyticsView() {
  const [range, setRange] = useState<TimeRangeSelection>(() =>
    getDatesForRangeKey("7d")
  );

  // Authoritative movie store subscription
  const currentTime = useDemoMovieStore((s) => s.currentTime);
  const status = useDemoMovieStore((s) => s.status);
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);

  // Dynamically derive facility analytics directly from running movie state
  const effectiveData = useMemo(() => {
    return deriveMovieAnalytics(currentTime, spaces, vehicles);
  }, [currentTime, spaces, vehicles]);

  const occupancyTimeline = effectiveData.trends.occupancy_timeline;
  const trafficTimeline = effectiveData.trends.traffic_timeline;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        subtitle="Authoritative facility analytics, occupancy trends, flow rates, and dwell duration synchronized with demo movie"
        badge={
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider transition-all ${
              status === "RUNNING"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 animate-pulse"
                : status === "PAUSED"
                ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                : status === "COMPLETED"
                ? "border-blue-500/40 bg-blue-500/15 text-blue-400"
                : "border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            {status === "RUNNING"
              ? "LIVE MOVIE SYNC · RUNNING"
              : status === "PAUSED"
              ? "TELEMETRY FROZEN · PAUSED"
              : status === "COMPLETED"
              ? "CYCLE COMPLETE · FINAL DATA"
              : "DEMO ENGINE · READY"}
          </span>
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">
              Total Slots: <strong className="text-foreground font-bold">60</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              aria-label="Refresh analytics"
              className="gap-1.5 text-xs font-mono"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      <TimeRangeSelector value={range} onChange={setRange} />

      <OverviewMetrics
        dashboard={effectiveData}
        occupancyTimeline={occupancyTimeline}
        isLoading={false}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OccupancyTrend data={occupancyTimeline} isLoading={false} />
        <TrafficTrend
          traffic={effectiveData.traffic}
          timeline={trafficTimeline}
          isLoading={false}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PeakUsage traffic={effectiveData.traffic} isLoading={false} />
        <UtilizationChart
          occupancy={effectiveData.occupancy}
          utilization={effectiveData.utilization}
          isLoading={false}
        />
      </div>

      <TimeBasedAnalysis
        duration={effectiveData.trends.duration_statistics}
        sessions={effectiveData.trends.session_statistics}
        isLoading={false}
      />
    </div>
  );
}
