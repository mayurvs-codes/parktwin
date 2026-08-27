/**
 * Domain types for Vehicle Management (Module 6 – Phase E).
 *
 * Mirrors the response shapes returned by the backend **`/integration`**
 * gateway (PROJECT_MEMORY.md §7). The frontend consumes the gateway's
 * vocabulary verbatim and performs **no business math** (occupancy, session
 * duration, and status are all derived presentation-side from backend data,
 * never recomputed). Fields are nullable where the gateway may omit them so
 * the UI degrades gracefully.
 *
 * `VehicleDTO` (from `@/types/dashboard`) and `SessionDTO` (from
 * `@/types/parking`) are reused — they are the canonical gateway projections
 * and are intentionally not re-declared here.
 */

import type { VehicleDTO } from "@/types/dashboard";
import type { SessionDTO } from "@/types/parking";

/**
 * Derived vehicle status for the list (presentation-only, from the vehicle's
 * sessions — not a backend field):
 * - `parked`  — has an active parking session
 * - `exited`  — has session history but nothing active
 * - `unknown` — no associated session data
 */
export type VehicleStatus = "parked" | "exited" | "unknown";

/**
 * Presentation view model for one vehicle row, assembled on the client by
 * joining the vehicle record to its (most recent / active) session. `confidence`
 * is taken from the backend `plate_confidence`; duration falls back to elapsed
 * time from `entry_time` for active sessions whose stored duration is 0.
 */
export interface VehicleRowView {
  vehicle: VehicleDTO;
  session: SessionDTO | null;
  status: VehicleStatus;
  slotId: string | null;
  entryTime: string | null;
  exitTime: string | null;
  durationSeconds: number;
  confidence: number | null;
  isRegistered: boolean;
}

/** A raw Module 2 lifecycle event (`GET /integration/events?source=module`). */
export interface ModuleEventDTO {
  event_uid: string | null;
  event_type: string | null;
  camera_id: string | null;
  slot_id: string | null;
  tracking_id: number | null;
  license_plate: string | null;
  timestamp: string | null;
  meta: Record<string, unknown>;
}

/** Envelope returned by `GET /integration/events?source=module`. */
export interface ModuleEventsResponseDTO {
  source: string;
  events: ModuleEventDTO[];
}

export type VehicleSortColumn =
  | "plate"
  | "type"
  | "status"
  | "slot"
  | "entry"
  | "exit"
  | "duration"
  | "confidence";

export type SortDirection = "asc" | "desc";

/** Client-side filter state for the vehicle list. */
export interface VehicleFilterState {
  status: VehicleStatus | "all";
  vehicleType: string | "all";
  /** Free-text slot search (presentation-only filter). */
  slot: string;
}
