"use client";

import { Car } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsChart, ChartSkeleton } from "./AnalyticsChart";
import { formatAxisTime, hourlyToChartData } from "./chart-utils";
import type { TrafficAnalyticsDTO, TrafficTimelinePoint } from "@/types/analytics";

interface TrafficTrendProps {
  traffic: TrafficAnalyticsDTO | undefined;
  timeline: ReadonlyArray<TrafficTimelinePoint>;
  isLoading?: boolean;
}

/**
 * Traffic trends. Shows the 24-hour entry distribution (bar) and the
 * entries/exits series over the selected time window (area). All series are
 * backend-computed — this component only paints them.
 */
export function TrafficTrend({ traffic, timeline, isLoading }: TrafficTrendProps) {
  const hourly = traffic ? hourlyToChartData(traffic.hourly_traffic) : [];
  const timelineData = timeline.map((p) => ({
    time: formatAxisTime(p.timestamp),
    vehicle_entries: p.vehicle_entries,
    vehicle_exits: p.vehicle_exits,
  }));

  const hasData = hourly.length > 0 || timelineData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic trends</CardTitle>
        <CardDescription>Vehicle entries by hour of day and over time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={Car}
            title="No traffic data"
            description="Vehicle entries and exits will appear here as sessions are recorded."
          />
        ) : (
          <>
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Entries by hour of day</p>
              <AnalyticsChart
                kind="bar"
                data={hourly}
                xKey="hour"
                height={240}
                ariaLabel="Vehicle entries by hour of day"
                series={[{ key: "entries", name: "Entries" }]}
              />
            </div>
            {timelineData.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Entries vs exits over time</p>
                <AnalyticsChart
                  kind="area"
                  data={timelineData}
                  xKey="time"
                  height={240}
                  showLegend
                  ariaLabel="Vehicle entries and exits over time"
                  series={[
                    { key: "vehicle_entries", name: "Entries" },
                    { key: "vehicle_exits", name: "Exits" },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
