"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartSkeleton } from "./AnalyticsChart";
import { formatHour, hourlyToChartData } from "./chart-utils";
import type { TrafficAnalyticsDTO } from "@/types/analytics";
import { formatNumber } from "@/lib/format";

interface PeakUsageProps {
  traffic: TrafficAnalyticsDTO | undefined;
  isLoading?: boolean;
}

const BASE_COLOR = "hsl(var(--primary))";
const PEAK_COLOR = "#ef4444";

/** Peak usage — the busiest hour of day plus its hourly distribution. */
export function PeakUsage({ traffic, isLoading }: PeakUsageProps) {
  const hourly = traffic ? hourlyToChartData(traffic.hourly_traffic) : [];
  const peakHour = traffic?.peak_hour ?? null;
  const peakEntries = traffic?.peak_hour_entries ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peak usage</CardTitle>
        <CardDescription>Busiest hour of day for vehicle entries</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton />
        ) : hourly.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No peak data"
            description="Peak usage will appear once traffic is recorded."
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-semibold tabular-nums text-foreground">
                {formatHour(peakHour)}
              </span>
              <span className="text-sm text-muted-foreground">
                peak hour · {formatNumber(peakEntries)} entries
              </span>
            </div>
            <div style={{ height: 240 }} role="img" aria-label="Hourly entry distribution with peak highlighted">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly}>
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={36} />
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <Tooltip />
                  <Bar dataKey="entries" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {hourly.map((entry) => {
                      const hourInt = Number(entry.hour.slice(0, 2));
                      const isPeak = hourInt === peakHour;
                      return (
                        <Cell key={entry.hour} fill={isPeak ? PEAK_COLOR : BASE_COLOR} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
