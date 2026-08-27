"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchModuleEvents, fetchSessions, fetchVehicles } from "@/services/vehicles";
import { elapsedSecondsFrom } from "@/lib/format";
import type { VehicleDTO } from "@/types/dashboard";
import type { SessionDTO } from "@/types/parking";
import type { ModuleEventDTO, VehicleRowView, VehicleStatus } from "@/types/vehicles";

/**
 * TanStack Query hooks for Vehicle Management (Module 6 – Phase E).
 *
 * All data comes from the backend `/integration` gateway. The hooks only
 * transport and assemble; they perform no occupancy/ownership/duration math.
 */

export const vehicleKeys = {
  list: (plate: string) => ["vehicles", "list", plate] as const,
  sessions: (plate: string) => ["vehicles", "sessions", plate] as const,
  detailSessions: (plate: string) => ["vehicles", "detail-sessions", plate] as const,
  detailEvents: (plate: string) => ["vehicles", "detail-events", plate] as const,
};

/** Pick the session that best represents a vehicle's *current* state. */
function pickPrimarySession(sessions: SessionDTO[]): SessionDTO | null {
  if (sessions.length === 0) return null;
  const active = sessions.find((s) => s.is_active);
  if (active) return active;
  const sorted = [...sessions].sort((a, b) => {
    const ta = a.entry_time ? new Date(a.entry_time).getTime() : 0;
    const tb = b.entry_time ? new Date(b.entry_time).getTime() : 0;
    return tb - ta;
  });
  return sorted[0] ?? null;
}

/**
 * Assemble per-vehicle view models by joining each vehicle record to its
 * session(s) on `license_plate`. This is a **display join** — status, slot,
 * entry/exit, and duration are read from the backend session, never
 * recomputed. Active sessions surface their slot; duration falls back to
 * elapsed time from `entry_time` when the stored value is 0.
 */
export function buildVehicleViews(
  vehicles: VehicleDTO[],
  sessions: SessionDTO[]
): VehicleRowView[] {
  const byPlate = new Map<string, SessionDTO[]>();
  for (const session of sessions) {
    if (!session.license_plate) continue;
    const existing = byPlate.get(session.license_plate);
    if (existing) existing.push(session);
    else byPlate.set(session.license_plate, [session]);
  }

  return vehicles.map((vehicle) => {
    const plate = vehicle.license_plate ?? "";
    const list = plate ? byPlate.get(plate) ?? [] : [];
    const session = pickPrimarySession(list);
    const status: VehicleStatus = session
      ? session.is_active
        ? "parked"
        : "exited"
      : "unknown";
    const durationSeconds =
      session != null
        ? session.duration_seconds > 0
          ? session.duration_seconds
          : elapsedSecondsFrom(session.entry_time)
        : 0;
    return {
      vehicle,
      session,
      status,
      slotId: session?.slot_id ?? null,
      entryTime: session?.entry_time ?? null,
      exitTime: session?.exit_time ?? null,
      durationSeconds,
      confidence: vehicle.plate_confidence != null ? vehicle.plate_confidence : null,
      isRegistered: vehicle.is_registered ?? false,
    };
  });
}

/**
 * List view: fetches vehicles (optionally plate-filtered via the backend) and
 * their sessions, then assembles joined view models. The parent component
 * applies presentation-only filtering, sorting, and pagination.
 */
export function useVehicles(plate?: string) {
  const key = plate ?? "all";
  const vehiclesQuery = useQuery({
    queryKey: vehicleKeys.list(key),
    queryFn: () => fetchVehicles({ limit: 1000, plate: plate || undefined }),
  });
  const sessionsQuery = useQuery({
    queryKey: vehicleKeys.sessions(key),
    queryFn: () => fetchSessions({ activeOnly: false, limit: 1000, plate: plate || undefined }),
  });

  const vehicles = vehiclesQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];
  const views = useMemo(() => buildVehicleViews(vehicles, sessions), [vehicles, sessions]);

  return {
    views,
    isLoading: vehiclesQuery.isLoading,
    isError: vehiclesQuery.isError || sessionsQuery.isError,
    refetch: () => {
      void vehiclesQuery.refetch();
      void sessionsQuery.refetch();
    },
  };
}

/**
 * Detail view: fetches the full session history and recent lifecycle events
 * for one plate. Events are filtered client-side by `license_plate` (the
 * backend events endpoint exposes no plate query param).
 */
export function useVehicleDetails(plate: string | null) {
  const enabled = plate != null && plate.length > 0;
  const safePlate = plate ?? "";

  const sessionsQuery = useQuery({
    queryKey: vehicleKeys.detailSessions(safePlate),
    queryFn: () => fetchSessions({ activeOnly: false, limit: 200, plate: safePlate }),
    enabled,
  });
  const eventsQuery = useQuery({
    queryKey: vehicleKeys.detailEvents(safePlate),
    queryFn: () => fetchModuleEvents(50),
    enabled,
  });

  const events = useMemo<ModuleEventDTO[]>(() => {
    const data = eventsQuery.data;
    if (!data || !plate) return [];
    return (data.events ?? []).filter((e) => e.license_plate === plate);
  }, [eventsQuery.data, plate]);

  return {
    sessions: sessionsQuery.data ?? [],
    events,
    isLoading: enabled && (sessionsQuery.isLoading || eventsQuery.isLoading),
    isError: sessionsQuery.isError || eventsQuery.isError,
  };
}
