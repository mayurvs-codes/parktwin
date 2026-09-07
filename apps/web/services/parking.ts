import { apiGet, apiPost } from "@/services/api-client";
import type { OccupancyDTO } from "@/types/dashboard";
import type { SessionDTO, SlotDTO } from "@/types/parking";

/**
 * Live Parking data layer. Thin, typed wrappers over the backend **`/integration`**
 * gateway (PROJECT_MEMORY.md §7). No business logic — slot state, occupancy, and
 * session math are all computed by the backend; this module only transports data.
 *
 * Feature components consume these through the TanStack Query hooks in
 * `hooks/useLiveParking.ts`.
 */

/** List parking slots (Module 2) through the unified gateway. */
export function fetchSlots(cameraId?: string, state?: string): Promise<SlotDTO[]> {
  const params: Record<string, string> = {};
  if (cameraId) params.camera_id = cameraId;
  if (state) params.state = state;
  return apiGet<SlotDTO[]>("/integration/slots", { params });
}

/** List parking sessions (Module 2) through the unified gateway. */
export function fetchSessions(
  activeOnly = true,
  limit = 200,
  cameraId?: string
): Promise<SessionDTO[]> {
  const params: Record<string, string | number | boolean> = { active_only: activeOnly, limit };
  if (cameraId) params.camera_id = cameraId;
  return apiGet<SessionDTO[]>("/integration/sessions", { params });
}

/** Current occupancy snapshot (Module 2) through the unified gateway. */
export function fetchOccupancy(cameraId?: string): Promise<OccupancyDTO> {
  const params: Record<string, string> = {};
  if (cameraId) params.camera_id = cameraId;
  return apiGet<OccupancyDTO>("/integration/occupancy", { params });
}

/** Reset Digital Twin: clear all slot occupancy, active sessions, and engine state. */
export function resetDigitalTwinState(): Promise<{ success: boolean; message: string }> {
  return apiPost<{ success: boolean; message: string }>("/parking/reset");
}

/** List registered cameras with roles and coordinates. */
export function fetchCameras(): Promise<any[]> {
  return apiGet<any[]>("/cameras");
}

/** List registered/detected vehicles. */
export function fetchVehicles(): Promise<any[]> {
  return apiGet<any[]>("/vehicles");
}
