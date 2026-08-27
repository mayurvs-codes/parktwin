import { apiGet } from "@/services/api-client";
import type { VehicleDTO } from "@/types/dashboard";
import type { SessionDTO } from "@/types/parking";
import type { ModuleEventsResponseDTO } from "@/types/vehicles";

/**
 * Vehicle Management data layer. Thin, typed wrappers over the backend
 * **`/integration`** gateway (PROJECT_MEMORY.md §7). No business logic — slot
 * state, sessions, durations, and events are all computed by the backend; this
 * module only transports data. Feature components consume these through the
 * TanStack Query hooks in `hooks/useVehicles.ts`.
 */

export interface VehicleListParams {
  limit?: number;
  skip?: number;
  /** Plate search — delegated to the backend (`/integration/vehicles?plate=`). */
  plate?: string;
}

/** List detected vehicles (Module 1) through the unified gateway. */
export function fetchVehicles(params: VehicleListParams = {}): Promise<VehicleDTO[]> {
  const query: Record<string, string | number> = { limit: params.limit ?? 1000 };
  if (params.skip) query.skip = params.skip;
  if (params.plate) query.plate = params.plate;
  return apiGet<VehicleDTO[]>("/integration/vehicles", { params: query });
}

export interface SessionListParams {
  activeOnly?: boolean;
  limit?: number;
  /** Plate filter — delegated to the backend (`/integration/sessions?plate=`). */
  plate?: string;
  cameraId?: string;
}

/** List parking sessions (Module 2) through the unified gateway. */
export function fetchSessions(params: SessionListParams = {}): Promise<SessionDTO[]> {
  const query: Record<string, string | number | boolean> = {
    active_only: params.activeOnly ?? false,
    limit: params.limit ?? 1000,
  };
  if (params.plate) query.plate = params.plate;
  if (params.cameraId) query.camera_id = params.cameraId;
  return apiGet<SessionDTO[]>("/integration/sessions", { params: query });
}

/**
 * Raw Module 2 lifecycle events (`source=module`). The caller filters by
 * `license_plate` client-side, since the events endpoint has no plate query
 * param — this is presentation-only filtering, not a backend change.
 */
export function fetchModuleEvents(limit = 50): Promise<ModuleEventsResponseDTO> {
  return apiGet<ModuleEventsResponseDTO>("/integration/events", {
    params: { source: "module", limit },
  });
}
