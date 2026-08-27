/**
 * Domain types for Live Parking (Module 6 – Phase D).
 *
 * These mirror the response shapes returned by the backend **`/integration`**
 * gateway (see PROJECT_MEMORY.md §7) — specifically `/integration/slots`,
 * `/integration/sessions`, and `/integration/occupancy`. The frontend consumes
 * the gateway's vocabulary verbatim and performs **no business math** (occupancy,
 * slot ownership, and durations are all computed backend-side). Fields are
 * nullable where the gateway may omit them so the UI can degrade gracefully.
 *
 * `OccupancyDTO` is reused from `@/types/dashboard` (the gateway occupancy shape
 * is identical across features) — it is intentionally not re-declared here to
 * avoid a duplicate type.
 */

/** Raw `state` value as emitted by the backend `SlotState` enum. */
export type SlotStateValue = "free" | "occupied" | "reserved" | "unknown";

/**
 * A single parking slot, projected from the gateway `GatewaySlot` DTO.
 * Consumed verbatim from `GET /integration/slots`.
 */
export interface SlotDTO {
  id: string | null;
  slot_id: string;
  camera_id: string;
  zone: string;
  state: SlotStateValue | null;
  is_reserved: boolean;
  reserved_for: string | null;
  position: unknown | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * A parking session, projected from the gateway `GatewaySession` DTO.
 * Consumed verbatim from `GET /integration/sessions`.
 */
export interface SessionDTO {
  session_uid: string | null;
  camera_id: string | null;
  slot_id: string | null;
  license_plate: string | null;
  tracking_id: number | null;
  entry_time: string | null;
  exit_time: string | null;
  duration_seconds: number;
  is_active: boolean;
  violation_flags: string[];
}

/**
 * Visual slot status used by the UI layer.
 *
 * - `free`      → `available`   (open / free to park)
 * - `occupied`  → `occupied`    (a vehicle is parked)
 * - `reserved`  → `reserved`    (held for a vehicle)
 * - (no backend value) → `disabled` — **future-ready** render-only state; the
 *   backend does not currently emit it, but the component supports it so the
 *   visualization is ready for disabled/inaccessible slots.
 * - otherwise   → `unknown`     (state unavailable / sensor off)
 */
export type SlotStatus = "available" | "occupied" | "reserved" | "disabled" | "unknown";

/**
 * Presentation view model for one parking slot, assembled on the client from
 * the slot DTO plus its active session (a join, not a business calculation).
 * `vehicleType` is only populated when the backend supplies it — the
 * `/integration/slots` + `/integration/sessions` payloads do not currently
 * carry a vehicle type, so it will usually be `null` ("if available").
 */
export interface ParkingSlotView {
  slot: SlotDTO;
  status: SlotStatus;
  /** License plate of the parked vehicle, from the active session (if any). */
  plate: string | null;
  /** Vehicle type — `null` when the backend does not supply it. */
  vehicleType: string | null;
  /** The active parking session for this slot, if one is open. */
  session: SessionDTO | null;
}
