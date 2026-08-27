"use client";

import { useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
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
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Historical insights and operational metrics
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            aria-label="Refresh analytics"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </Button>
        </div>
        <TimeRangeSelector value={range} onChange={setRange} />
      </header>

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
