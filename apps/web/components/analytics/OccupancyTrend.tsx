"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalyticsChart, ChartSkeleton } from "./AnalyticsChart";
import { formatAxisTime } from "./chart-utils";
import type { OccupancyTimelinePoint } from "@/types/analytics";

interface OccupancyTrendProps {
  data: ReadonlyArray<OccupancyTimelinePoint>;
  isLoading?: boolean;
}

/** Occupancy trend (area chart) over the selected time window. */
export function OccupancyTrend({ data, isLoading }: OccupancyTrendProps) {
  const chartData = data.map((p) => ({
    time: formatAxisTime(p.timestamp),
    occupancy_percentage: p.occupancy_percentage,
    current_occupancy: p.current_occupancy,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Occupancy trend</CardTitle>
        <CardDescription>Occupancy percentage and occupied slots over time</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton />
        ) : chartData.length === 0 ? (
          <EmptyState
            icon={LineChartIcon}
            title="No occupancy history"
            description="Occupancy snapshots will appear here as the system records them."
          />
        ) : (
          <AnalyticsChart
            kind="area"
            data={chartData}
            xKey="time"
            height={260}
            showLegend
            ariaLabel="Occupancy trend over time"
            series={[
              { key: "occupancy_percentage", name: "Occupancy %" },
              { key: "current_occupancy", name: "Occupied slots" },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
