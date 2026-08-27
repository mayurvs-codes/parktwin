"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Car,
  CircleDot,
  LogIn,
  LogOut,
  ParkingSquare,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents } from "@/hooks/useDashboard";
import { formatRelativeTime } from "@/lib/format";
import type { IntegrationEventDTO } from "@/types/dashboard";

const EVENT_META: Record<string, { icon: LucideIcon; title: string }> = {
  VehicleDetected: { icon: Car, title: "Vehicle detected" },
  VehicleTracked: { icon: Activity, title: "Vehicle tracked" },
  VehicleParked: { icon: ParkingSquare, title: "Vehicle parked" },
  VehicleExited: { icon: LogOut, title: "Vehicle exited" },
  SessionStarted: { icon: LogIn, title: "Parking session started" },
  SessionEnded: { icon: LogOut, title: "Parking session ended" },
  SlotOccupied: { icon: ParkingSquare, title: "Slot occupied" },
  SlotReleased: { icon: CircleDot, title: "Slot released" },
};

/** Pull a human-readable subject (plate / slot / camera) out of an event. */
function subjectOf(ev: IntegrationEventDTO): string | null {
  const p = ev.payload ?? {};
  const licensePlate =
    (p.license_plate as string | undefined) ??
    (p.record as Record<string, unknown> | undefined)?.license_plate as string | undefined;
  if (licensePlate) return String(licensePlate);
  const slot = p.slot_id as string | undefined;
  if (slot) return `Slot ${String(slot)}`;
  if (ev.camera_id) return String(ev.camera_id);
  return null;
}

function describe(ev: IntegrationEventDTO): { icon: LucideIcon; title: string; detail: string } {
  const meta = EVENT_META[ev.event_type] ?? { icon: RefreshCw, title: ev.event_type ?? "Event" };
  const subject = subjectOf(ev);
  return {
    icon: meta.icon,
    title: meta.title,
    detail: subject ? `${subject} · ${ev.camera_id ?? "unknown camera"}` : (ev.camera_id ?? "System event"),
  };
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3" aria-hidden data-testid="activity-skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Recent activity panel — a feed of the latest integration events with
 * timestamps and concise descriptions from the gateway event bus.
 */
export function RecentActivityPanel() {
  const { data, isLoading, isError, refetch } = useEvents(50);
  const events = data?.events ?? [];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <ActivitySkeleton />
        ) : isError ? (
          <ErrorState
            title="Couldn't load activity"
            description="The event feed is unavailable."
            onRetry={() => void refetch()}
          />
        ) : events.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Parking events will appear here as they happen."
          />
        ) : (
          <ul className="space-y-3" aria-label="Recent parking activity" role="list">
            {events.slice(0, 8).map((ev) => {
              const { icon: Icon, title, detail } = describe(ev);
              return (
                <li key={ev.event_id} className="flex items-start gap-3" role="listitem">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="truncate text-xs text-muted-foreground">{detail}</p>
                  </div>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={ev.timestamp ?? undefined}
                  >
                    {formatRelativeTime(ev.timestamp)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
