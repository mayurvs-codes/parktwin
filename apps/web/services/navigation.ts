import { apiGet } from "@/services/api-client";
import type { RouteData } from "@/types/digitalTwin";

/**
 * Fetch shortest path navigation route between origin node and destination slot.
 */
export async function fetchNavigationRoute(
  toSlot: string,
  fromNode = "ENTRY_GATE"
): Promise<RouteData> {
  return apiGet<RouteData>("/navigation/route", {
    params: { to_slot: toSlot, from_node: fromNode },
  });
}

/**
 * Fetch individual vehicle navigation route based on its active destination.
 */
export async function fetchVehicleNavigation(
  vehicleId: string,
  fromNode = "ENTRY_GATE"
): Promise<RouteData> {
  return apiGet<RouteData>(`/navigation/vehicle/${encodeURIComponent(vehicleId)}`, {
    params: { from_node: fromNode },
  });
}
