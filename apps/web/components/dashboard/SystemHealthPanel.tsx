"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealth } from "@/hooks/useDashboard";
import { formatNumber, formatPercent } from "@/lib/format";

function StatusRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge: "success" | "warning" | "destructive" | "outline";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={badge}>{value}</Badge>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div className="space-y-3" aria-hidden data-testid="health-skeleton">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-full" />
      ))}
    </div>
  );
}

/**
 * System health panel — status of the backend modules via the gateway health
 * endpoint. Pure read/display of `GET /integration/health`.
 */
export function SystemHealthPanel() {
  const { data, isLoading, isError, refetch } = useHealth();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>System Health</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <HealthSkeleton />
        ) : isError || !data ? (
          <ErrorState
            title="Couldn't load system health"
            description="The integration service is unreachable."
            onRetry={() => void refetch()}
          />
        ) : (
          <div>
            <StatusRow
              label="Integration layer"
              value={(data.integration ?? data.status) === "ok" ? "Operational" : (data.integration ?? data.status ?? "Offline")}
              badge={(data.integration ?? data.status) === "ok" ? "success" : "destructive"}
            />
            <StatusRow
              label="Parking intelligence engine"
              value={data.parking_engine_initialized ? "Initialized" : "Not initialized"}
              badge={data.parking_engine_initialized ? "success" : "warning"}
            />
            <StatusRow label="Event bus" value={data.event_bus} badge="outline" />
            <StatusRow
              label="WebSocket subscribers"
              value={`${formatNumber(
                Object.values(data.websocket_subscribers ?? {}).reduce((a, b) => a + (b ?? 0), 0)
              )} active`}
              badge="outline"
            />
            <StatusRow
              label="Occupancy"
              value={`${formatPercent(data.occupancy.occupancy_rate ?? 0)} · ${formatNumber(
                data.occupancy.free ?? 0
              )}/${formatNumber(data.occupancy.total_slots ?? 0)} free`}
              badge="outline"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
