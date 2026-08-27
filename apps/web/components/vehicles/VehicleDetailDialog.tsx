"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { formatConfidence, formatDateTime, formatDuration } from "@/lib/format";
import { useVehicleDetails } from "@/hooks/useVehicles";
import type { VehicleRowView } from "@/types/vehicles";
import { useQuery } from "@tanstack/react-query";
import { fetchJourneyByPlate } from "@/services/journey";
import { JourneyTimeline } from "@/components/digital-twin/JourneyTimeline";
import { VehicleHistory } from "./VehicleHistory";
import { VehicleStatusBadge } from "./VehicleStatusBadge";

export interface VehicleDetailDialogProps {
  view: VehicleRowView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Read-only vehicle detail dialog. Shows vehicle attributes, the current
 * parking session, the full session history, and recent lifecycle events —
 * all sourced from existing backend endpoints. Nothing here is editable and no
 * values are computed on the frontend.
 */
export function VehicleDetailDialog({ view, open, onOpenChange }: VehicleDetailDialogProps) {
  const plate = view?.vehicle.license_plate ?? null;
  const { sessions, events, isLoading, isError } = useVehicleDetails(plate);
  const recentEvents = events.slice(0, 8);

  const { data: journey } = useQuery({
    queryKey: ["journey", plate],
    queryFn: () => (plate ? fetchJourneyByPlate(plate) : null),
    enabled: Boolean(plate && open),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={plate ? `Vehicle ${plate}` : "Vehicle details"}
      description="Read-only vehicle information."
    >
      {view && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Vehicle</h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Plate" value={view.vehicle.license_plate ?? "—"} />
              <Field label="Type" value={view.vehicle.vehicle_type ?? "—"} />
              <Field label="Status" value={<VehicleStatusBadge status={view.status} />} />
              <Field label="Brand" value={view.vehicle.brand ?? "—"} />
              <Field label="Model" value={view.vehicle.model ?? "—"} />
              <Field label="Color" value={view.vehicle.color ?? "—"} />
              <Field label="Registered" value={view.isRegistered ? "Yes" : "No"} />
              <Field label="Confidence" value={formatConfidence(view.confidence)} />
              <Field label="Last seen" value={formatDateTime(view.vehicle.last_seen)} />
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Current session</h3>
            {view.session ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Slot" value={view.slotId ?? "—"} />
                <Field label="Entry" value={formatDateTime(view.entryTime)} />
                <Field label="Exit" value={formatDateTime(view.exitTime)} />
                <Field label="Duration" value={formatDuration(view.durationSeconds)} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No active parking session.</p>
            )}
          </section>

          {journey && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">3-Camera Journey Timeline</h3>
              <JourneyTimeline journey={journey} />
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Session history</h3>
            {isLoading ? (
              <div className="space-y-2" aria-hidden>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : isError ? (
              <ErrorState
                title="Couldn't load history"
                description="Session history is unavailable."
              />
            ) : (
              <VehicleHistory sessions={sessions} />
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Recent events</h3>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent events for this vehicle.</p>
            ) : (
              <ul className="space-y-2" role="list">
                {recentEvents.map((ev, i) => {
                  const key = ev.event_uid ?? `${ev.event_type}-${ev.timestamp}-${i}`;
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium text-foreground">{ev.event_type ?? "Event"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(ev.timestamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </Dialog>
  );
}
