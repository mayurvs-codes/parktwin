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
import { fetchVehicleTimeline, fetchVehicleRoute } from "@/services/video-library";
import { JourneyTimeline } from "@/components/digital-twin/JourneyTimeline";
import { Camera, Navigation } from "lucide-react";
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
 * parking session, the full session history, visual CCTV evidence crops,
 * Dijkstra navigation guidance, and recent lifecycle events.
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

  const { data: timelineData } = useQuery({
    queryKey: ["vehicle-timeline", plate],
    queryFn: () => (plate ? fetchVehicleTimeline(plate) : null),
    enabled: Boolean(plate && open),
  });

  const { data: routeData } = useQuery({
    queryKey: ["vehicle-route", plate],
    queryFn: () => (plate ? fetchVehicleRoute(plate) : null),
    enabled: Boolean(plate && open),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={plate ? `Vehicle ${plate}` : "Vehicle details"}
      description="Operational vehicle details, CCTV evidence, and navigation guidance."
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

          {/* Visual Evidence (CCTV & ANPR Crops) */}
          {timelineData && (timelineData.evidence_car_crop || timelineData.evidence_plate_crop) && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <span>Visual Evidence (CCTV Crops)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {timelineData.evidence_car_crop && (
                  <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                    <div className="bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground flex justify-between">
                      <span>Vehicle Capture</span>
                      <span>CAM-01 / CAM-02</span>
                    </div>
                    <div className="aspect-video relative bg-black/40 flex items-center justify-center overflow-hidden">
                      <img
                        src={timelineData.evidence_car_crop}
                        alt="Vehicle CCTV crop"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {timelineData.evidence_plate_crop && (
                  <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
                    <div className="bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground flex justify-between">
                      <span>License Plate OCR Crop</span>
                      <span className="font-mono text-primary font-bold">
                        {timelineData.license_plate}
                      </span>
                    </div>
                    <div className="aspect-video relative bg-black/40 flex items-center justify-center p-2">
                      <img
                        src={timelineData.evidence_plate_crop}
                        alt="License plate OCR crop"
                        className="max-h-full max-w-full object-contain rounded border border-border/40"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

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

          {/* Individual Vehicle Dijkstra Navigation */}
          {routeData && routeData.path && routeData.path.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span>Dijkstra Navigation Guidance</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  Distance: {routeData.distance_meters.toFixed(1)}m
                </span>
              </h3>
              <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                {/* Waypoints path chain */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {routeData.path.map((node, i) => (
                    <div key={node} className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                          i === routeData.path.length - 1
                            ? "bg-primary text-primary-foreground font-bold"
                            : i === 0
                            ? "bg-secondary text-secondary-foreground font-medium"
                            : "bg-muted text-muted-foreground font-medium"
                        }`}
                      >
                        {node}
                      </span>
                      {i < routeData.path.length - 1 && (
                        <span className="text-muted-foreground text-xs">&rarr;</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Turn-by-turn directions */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Turn-by-Turn Directions
                  </span>
                  <ol className="space-y-1 text-xs list-decimal list-inside text-foreground">
                    {routeData.directions.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          )}

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
