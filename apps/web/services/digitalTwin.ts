/**
 * ParkTwin AI — Digital Twin API Client Service
 * =============================================
 * Consumes backend REST endpoints for live slots, vehicles, sessions,
 * cameras, and Dijkstra navigation shortest paths.
 */

import { apiGet, apiPost } from "@/services/api-client";
import type { RouteData, TwinCameraState, TwinVehicleState } from "@/types/digitalTwin";
import type { SessionDTO, SlotDTO } from "@/types/parking";

export async function fetchDigitalTwinSlots(): Promise<SlotDTO[]> {
  try {
    const res = await apiGet<SlotDTO[]>("/slots");
    return res || [];
  } catch {
    // Fallback to integration endpoint if available
    try {
      const res = await apiGet<SlotDTO[]>("/integration/slots");
      return res || [];
    } catch {
      return [];
    }
  }
}

export async function fetchDigitalTwinVehicles(): Promise<TwinVehicleState[]> {
  try {
    const res = await apiGet<TwinVehicleState[]>("/vehicles");
    return res || [];
  } catch {
    return [];
  }
}

export async function fetchDigitalTwinSessions(activeOnly = false): Promise<SessionDTO[]> {
  try {
    const res = await apiGet<SessionDTO[]>(`/sessions${activeOnly ? "?active_only=true" : ""}`);
    return res || [];
  } catch {
    return [];
  }
}

export interface CameraApiItem {
  camera_id: string;
  name?: string;
  zone?: string;
  role?: string;
  designated_role?: string;
  status?: string;
  url?: string;
  stream_url?: string;
  coverage_slots?: string[];
  x?: number;
  y?: number;
  angle?: number;
  fov?: number;
}

export async function fetchDigitalTwinCameras(): Promise<CameraApiItem[]> {
  try {
    const res = await apiGet<CameraApiItem[]>("/cameras");
    return res || [];
  } catch {
    return [];
  }
}

export async function fetchNavigationRoute(
  fromNode: string = "ENTRY_GATE",
  toSlot: string = "P02"
): Promise<RouteData | null> {
  try {
    const res = await apiGet<RouteData>(
      `/navigation/route?from_node=${encodeURIComponent(fromNode)}&to_slot=${encodeURIComponent(toSlot)}`
    );
    return res || null;
  } catch (err) {
    console.error("Failed to fetch navigation route:", err);
    return null;
  }
}

export async function fetchVehicleRoute(
  vehicleIdOrPlate: string,
  fromNode: string = "ENTRY_GATE"
): Promise<RouteData | null> {
  try {
    const res = await apiGet<RouteData>(
      `/navigation/route?vehicle_id=${encodeURIComponent(vehicleIdOrPlate)}&from_node=${encodeURIComponent(fromNode)}`
    );
    return res || null;
  } catch {
    return null;
  }
}

export async function triggerScenarioReplay(scenario = "monday"): Promise<boolean> {
  try {
    await apiPost(`/prototype/replay?scenario=${encodeURIComponent(scenario)}`, {});
    return true;
  } catch {
    return false;
  }
}

export async function resetScenario(): Promise<boolean> {
  try {
    await apiPost("/prototype/reset", {});
    return true;
  } catch {
    return false;
  }
}
