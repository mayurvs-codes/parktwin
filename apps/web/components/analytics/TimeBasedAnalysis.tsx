"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsChart, ChartSkeleton } from "./AnalyticsChart";
import { formatNumber } from "@/lib/format";
import type { DurationStatisticsDTO, SessionStatisticsDTO } from "@/types/analytics";

interface TimeBasedAnalysisProps {
  duration: DurationStatisticsDTO | undefined;
  sessions: SessionStatisticsDTO | undefined;
  isLoading?: boolean;
}

/** Time-based analysis: parking-duration distribution + session statistics. */
export function TimeBasedAnalysis({ duration, sessions, isLoading }: TimeBasedAnalysisProps) {
  const distribution = duration?.distribution ?? [];
  const chartData = distribution.map((b) => ({
    label: b.bucket_label,
    count: b.count,
  }));

  const sessionStats = sessions
    ? [
        { label: "Total sessions", value: formatNumber(sessions.total_sessions) },
        { label: "Active", value: formatNumber(sessions.active_sessions) },
        { label: "Closed", value: formatNumber(sessions.closed_sessions) },
        { label: "Avg duration", value: sessions.average_duration },
        { label: "Max duration", value: sessions.max_duration },
      ]
    : [];

  const hasData = chartData.length > 0 || sessionStats.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time-based analysis</CardTitle>
        <CardDescription>How long vehicles park and session volume</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={BarChart3}
            title="No time-based data"
            description="Duration and session statistics will appear as sessions complete."
          />
        ) : (
          <>
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Parking duration distribution
              </p>
              {chartData.length > 0 ? (
                <AnalyticsChart
                  kind="bar"
                  data={chartData}
                  xKey="label"
                  height={240}
                  ariaLabel="Parking duration distribution"
                  series={[{ key: "count", name: "Vehicles" }]}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No completed sessions with a recorded duration yet.
                </p>
              )}
            </div>

            {sessionStats.length > 0 && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {sessionStats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-md border border-border bg-muted/40 px-3 py-2"
                  >
                    <dt className="text-xs text-muted-foreground">{s.label}</dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
