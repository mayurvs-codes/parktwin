"use client";

import React from "react";
import {
  Activity,
  BarChart3,
  Clock,
  MinusCircle,
  Timer,
  TrendingUp,
} from "lucide-react";
import { MetricCard } from "@/components/analytics/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsDashboard } from "@/hooks/useAnalytics";
import { formatDuration } from "@/lib/format";

export function TwinStatisticsPanel() {
  const { data, isLoading, isError } = useAnalyticsDashboard();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Utilization Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Utilization Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Activity className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Analytics data unavailable</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const occPct =
    data.occupancy?.average_occupancy_percentage != null
      ? `${Math.round(data.occupancy.average_occupancy_percentage)}%`
      : "—";

  const peakHourStr =
    data.traffic?.peak_hour != null
      ? `${String(data.traffic.peak_hour).padStart(2, "0")}:00`
      : "—";

  const mostUsedItem = data.utilization?.most_used_slots?.[0];
  const mostUsedStr = mostUsedItem
    ? `${mostUsedItem.slot_id} (${mostUsedItem.usage_count} sessions)`
    : "—";

  const leastUsedItem = data.utilization?.least_used_slots?.[0];
  const leastUsedStr = leastUsedItem
    ? `${leastUsedItem.slot_id} (${leastUsedItem.usage_count} sessions)`
    : "—";

  const avgDurationSec =
    data.trends?.session_statistics?.average_duration_seconds;
  const avgDurationStr =
    data.trends?.session_statistics?.average_duration ||
    (avgDurationSec ? formatDuration(avgDurationSec) : "—");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Utilization Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetricCard
          label="Average Occupancy"
          value={occPct}
          icon={BarChart3}
          tone="info"
        />
        <MetricCard
          label="Peak Traffic Hour"
          value={peakHourStr}
          icon={Clock}
          tone="warning"
        />
        <MetricCard
          label="Most Used Slot"
          value={mostUsedStr}
          icon={TrendingUp}
          tone="success"
        />
        <MetricCard
          label="Least Used Slot"
          value={leastUsedStr}
          icon={MinusCircle}
          tone="default"
        />
        <MetricCard
          label="Avg Session Duration"
          value={avgDurationStr}
          icon={Timer}
          tone="info"
        />
      </CardContent>
    </Card>
  );
}
