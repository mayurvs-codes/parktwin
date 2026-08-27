import { apiGet } from "@/services/api-client";
import type {
  EventsResponseDTO,
  HealthDTO,
  OccupancyDTO,
  StatisticsDTO,
  VehicleDTO,
} from "@/types/dashboard";

/**
 * Dashboard data layer. Thin, typed wrappers over the backend **`/integration`**
 * gateway (PROJECT_MEMORY.md §7). No business logic — every aggregate
 * (occupancy rate, session counts, durations) is computed by the backend.
 *
 * Feature components consume these through the TanStack Query hooks in
 * `hooks/useDashboard.ts`.
 */

/** Current occupancy snapshot for all cameras. */
export function fetchOccupancy(): Promise<OccupancyDTO> {
  return apiGet<OccupancyDTO>("/integration/occupancy");
}

/** Aggregate parking statistics (sessions, durations, violations, …). */
export function fetchStatistics(): Promise<StatisticsDTO> {
  return apiGet<StatisticsDTO>("/integration/statistics");
}

/** Recent events from the integration event bus. */
export function fetchEvents(limit = 50): Promise<EventsResponseDTO> {
  return apiGet<EventsResponseDTO>("/integration/events", {
    params: { source: "integration", limit },
  });
}

/** Unified integration-layer health (engines, bus, WS, occupancy). */
export function fetchHealth(): Promise<HealthDTO> {
  return apiGet<HealthDTO>("/integration/health");
}

/** Recently detected vehicles (used for "Today's Vehicles" + activity). */
export function fetchVehicles(limit = 100): Promise<VehicleDTO[]> {
  return apiGet<VehicleDTO[]>("/integration/vehicles", { params: { limit } });
}

/** Active parking sessions (used to enrich recent activity). */
export function fetchActiveSessions(limit = 50): Promise<unknown[]> {
  return apiGet<unknown[]>("/integration/sessions", {
    params: { active_only: true, limit },
  });
}
