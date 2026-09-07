"use client";

import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAnalyticsDashboard } from "@/hooks/useAnalytics";
import { TimeRangeSelector, getDatesForRangeKey, type TimeRangeSelection } from "./TimeRangeSelector";
import { OverviewMetrics } from "./OverviewMetrics";
import { OccupancyTrend } from "./OccupancyTrend";
import { TrafficTrend } from "./TrafficTrend";
import { PeakUsage } from "./PeakUsage";
import { UtilizationChart } from "./UtilizationChart";
import { TimeBasedAnalysis } from "./TimeBasedAnalysis";

/**
 * Analytics (Module 6 – Phase F) — presentation layer only.
 *
 * Composes the reusable analytics sections: overview metrics, occupancy
 * trends, traffic trends, peak usage, utilization, and time-based analysis.
 * All numbers come from the backend `/analytics` router (via the
 * `useAnalyticsDashboard` query) — the frontend performs no analytics math.
 *
 * Range selection passes start and end timestamps directly to the backend
 * `/analytics/dashboard` query parameters for server-side date range filtering.
 */
export function AnalyticsView() {
  const [range, setRange] = useState<TimeRangeSelection>(() =>
    getDatesForRangeKey("7d")
  );
  const { data, isLoading, isError, refetch } = useAnalyticsDashboard({
    start: range.start,
    end: range.end,
  });

  const occupancyTimeline = data?.trends.occupancy_timeline ?? [];
  const trafficTimeline = data?.trends.traffic_timeline ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        subtitle="Canonical facility analytics, occupancy trends, flow rates, and dwell duration"
        badge={
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Telemetry Engine
          </span>
        }
        rightSlot={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            aria-label="Refresh analytics"
            className="gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
            <span>Refresh</span>
          </Button>
        }
      />

      <TimeRangeSelector value={range} onChange={setRange} />

      {isError ? (
        <ErrorState
          title="Couldn't load analytics"
          description="The analytics service may be unavailable."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <OverviewMetrics
            dashboard={data}
            occupancyTimeline={occupancyTimeline}
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OccupancyTrend data={occupancyTimeline} isLoading={isLoading} />
            <TrafficTrend
              traffic={data?.traffic}
              timeline={trafficTimeline}
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PeakUsage traffic={data?.traffic} isLoading={isLoading} />
            <UtilizationChart
              occupancy={data?.occupancy}
              utilization={data?.utilization}
              isLoading={isLoading}
            />
          </div>

          <TimeBasedAnalysis
            duration={data?.trends.duration_statistics}
            sessions={data?.trends.session_statistics}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
