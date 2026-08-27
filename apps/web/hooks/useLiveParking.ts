"use client";

import { useMemo } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchOccupancy, fetchSessions, fetchSlots } from "@/services/parking";
import usePreferences from "@/store/preferences";
import type { OccupancyDTO } from "@/types/dashboard";
import type { ParkingSlotView, SessionDTO, SlotDTO, SlotStatus } from "@/types/parking";
import { useParkingWebSocket } from "./useParkingWebSocket";

/**
 * TanStack Query hooks for Live Parking (Module 6 – Phase D).
 *
 * Each hook owns one gateway call and exposes the standard
 * loading/error/data tuple. `refetchInterval` makes the page a **live** view:
 * the backend is the single source of truth for slot state, occupancy, and
 * sessions, and the client simply re-reads it on an interval. This is the
 * transport-agnostic real-time seam — swapping to a WebSocket push later means
 * changing only the refetch strategy here, not the components.
 */

export const parkingKeys = {
  slots: (cameraId?: string) => ["parking", "slots", cameraId ?? "all"] as const,
  sessions: (activeOnly: boolean, limit: number, cameraId?: string) =>
    ["parking", "sessions", activeOnly, limit, cameraId ?? "all"] as const,
  occupancy: (cameraId?: string) => ["parking", "occupancy", cameraId ?? "all"] as const,
};

export function useSlots(cameraId?: string, refetchInterval?: number) {
  return useQuery({
    queryKey: parkingKeys.slots(cameraId),
    queryFn: () => fetchSlots(cameraId),
    refetchInterval,
  });
}

export function useSessions(
  activeOnly = true,
  limit = 200,
  cameraId?: string,
  refetchInterval?: number
) {
  return useQuery({
    queryKey: parkingKeys.sessions(activeOnly, limit, cameraId),
    queryFn: () => fetchSessions(activeOnly, limit, cameraId),
    refetchInterval,
  });
}

export function useOccupancy(cameraId?: string, refetchInterval?: number) {
  return useQuery({
    queryKey: parkingKeys.occupancy(cameraId),
    queryFn: () => fetchOccupancy(cameraId),
    refetchInterval,
  });
}

/** Map a backend slot + its reservation flag to a UI status. */
function toStatus(slot: SlotDTO): SlotStatus {
  if (slot.is_reserved) return "reserved";
  switch (slot.state) {
    case "free":
      return "available";
    case "occupied":
      return "occupied";
    case "reserved":
      return "reserved";
    case "unknown":
      return "unknown";
    default:
      return "unknown";
  }
}

/**
 * Assemble the per-slot presentation view by joining each slot to its active
 * session. This is a **client-side join for display only** — no occupancy or
 * ownership logic. Occupied slots surface the plate/session of their active
 * session; `vehicleType` stays `null` because the gateway payloads do not
 * carry a vehicle type (it is rendered as "—" when unavailable).
 */
export function buildSlotViews(slots: SlotDTO[], sessions: SessionDTO[]): ParkingSlotView[] {
  const activeBySlot = new Map<string, SessionDTO>();
  for (const session of sessions) {
    if (session.is_active && session.slot_id) {
      activeBySlot.set(session.slot_id, session);
    }
  }
  return slots.map((slot) => {
    const session = slot.slot_id ? activeBySlot.get(slot.slot_id) ?? null : null;
    return {
      slot,
      status: toStatus(slot),
      plate: session?.license_plate ?? null,
      vehicleType: null,
      session,
    };
  });
}

export interface UseLiveParkingResult {
  views: ParkingSlotView[];
  slots: SlotDTO[];
  sessions: SessionDTO[];
  occupancy: OccupancyDTO | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Aggregate live-parking hook. Polls slots, active sessions, and occupancy on a
 * shared interval and returns assembled, render-ready views. The WebSocket hook
 * (`useParkingWebSocket`) invalidates these queries on live nudges, so this hook
 * is the single data source the UI renders against.
 */
export function useLiveParking(cameraId?: string, refetchIntervalOverride?: number): UseLiveParkingResult {
  const { pollingInterval } = usePreferences();
  const refetchInterval = refetchIntervalOverride ?? pollingInterval;

  useParkingWebSocket({ cameraId });

  const slotsQuery: UseQueryResult<SlotDTO[]> = useSlots(cameraId, refetchInterval);
  const sessionsQuery: UseQueryResult<SessionDTO[]> = useSessions(
    true,
    200,
    cameraId,
    refetchInterval
  );
  const occupancyQuery: UseQueryResult<OccupancyDTO> = useOccupancy(cameraId, refetchInterval);


  const slots = slotsQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const views = useMemo(() => buildSlotViews(slots, sessions), [slots, sessions]);

  const isLoading =
    slotsQuery.isLoading || sessionsQuery.isLoading || occupancyQuery.isLoading;
  const isError =
    slotsQuery.isError || sessionsQuery.isError || occupancyQuery.isError;

  const refetch = () => {
    void slotsQuery.refetch();
    void sessionsQuery.refetch();
    void occupancyQuery.refetch();
  };

  return {
    views,
    slots,
    sessions,
    occupancy: occupancyQuery.data ?? null,
    isLoading,
    isError,
    refetch,
  };
}
