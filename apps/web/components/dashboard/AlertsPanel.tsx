"use client";

import { Alert } from "@/components/dashboard/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents, useHealth } from "@/hooks/useDashboard";
import type { AlertItem } from "@/types/dashboard";

/** Build the alert set from live gateway data (health + recent events). */
function buildAlerts(health: ReturnType<typeof useHealth>["data"], events: ReturnType<typeof useEvents>["data"]): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (health) {
    const intStatus = health.integration ?? health.status ?? "ok";
    if (intStatus !== "ok") {
      alerts.push({
        id: "integration-degraded",
        severity: "destructive",
        title: "Integration layer degraded",
        message: `Integration service reports status "${intStatus}".`,
      });
    }
    if (!health.parking_engine_initialized) {
      alerts.push({
        id: "engine-not-initialized",
        severity: "warning",
        title: "Parking engine not initialized",
        message: "Slot mapping and occupancy tracking are not yet active.",
      });
    }
    const rate = health.occupancy.occupancy_rate ?? 0;
    if (rate >= 90) {
      alerts.push({
        id: "near-capacity",
        severity: "destructive",
        title: "Parking near capacity",
        message: `${rate.toFixed(0)}% of all slots are currently occupied.`,
      });
    } else if (rate >= 75) {
      alerts.push({
        id: "high-occupancy",
        severity: "warning",
        title: "High occupancy",
        message: `${rate.toFixed(0)}% of all slots are currently occupied.`,
      });
    }
  }

  for (const ev of (events?.events ?? []).slice(0, 5)) {
    const type = (ev.event_type ?? "").toLowerCase();
    const isViolation =
      type.includes("violation") ||
      Boolean((ev.payload as Record<string, unknown> | undefined)?.violation);
    if (isViolation) {
      alerts.push({
        id: `violation-${ev.event_id}`,
        severity: "warning",
        title: "Parking violation detected",
        message: ev.payload?.license_plate
          ? `Vehicle ${String(ev.payload.license_plate)} flagged.`
          : "A parking violation was recorded.",
        timestamp: ev.timestamp,
      });
    }
  }

  // Placeholder until the backend exposes a dedicated alert feed: surface a
  // single "all clear" card so the panel is never empty in a healthy system.
  if (alerts.length === 0) {
    alerts.push({
      id: "all-clear",
      severity: "success",
      title: "No active alerts",
      message: "All monitored systems are operating normally.",
    });
  }

  return alerts;
}

function AlertsSkeleton() {
  return (
    <div className="space-y-2" aria-hidden data-testid="alerts-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[60px] w-full rounded-md" />
      ))}
    </div>
  );
}

/**
 * Alerts panel. Surfaces system + parking alerts derived from the gateway's
 * health and event feeds. The reusable `Alert` component renders the list and
 * can show placeholder data until a dedicated backend alert feed is integrated.
 */
export function AlertsPanel() {
  const health = useHealth();
  const events = useEvents(50);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {health.isLoading ? (
          <AlertsSkeleton />
        ) : health.isError ? (
          <ErrorState
            title="Couldn't load alerts"
            description="Health service unavailable."
            onRetry={() => void health.refetch()}
          />
        ) : (
          <ul className="space-y-2" aria-label="System and parking alerts">
            {buildAlerts(health.data, events.data).map((alert) => (
              <Alert key={alert.id} item={alert} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
