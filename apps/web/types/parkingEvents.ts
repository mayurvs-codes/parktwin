/**
 * ParkTwin AI — Normalized Parking Domain Event Layer
 * ====================================================
 * A unified, normalized event model consumed by both Admin and Driver portals.
 * Ensures that neither portal parses raw ANPR JSON directly.
 */

export type ParkingEventType =
  | "ENTRY_DETECTED"
  | "VEHICLE_IDENTIFIED"
  | "PLATE_RECOGNIZED"
  | "PARKING_ASSIGNED"
  | "NAVIGATION_STARTED"
  | "VEHICLE_PARKED"
  | "SESSION_STARTED"
  | "EXIT_REQUESTED"
  | "EXIT_NAVIGATION_STARTED"
  | "GATEWAY_REACHED"
  | "VEHICLE_EXITED"
  | "SESSION_COMPLETED";

export type EventSource = "CCTV_ANPR" | "APP_DECISION" | "DEMO_SCENARIO" | "DEMO_CONTROLLER";

export interface NormalizedParkingEvent {
  eventId: string;
  eventType: ParkingEventType;
  vehicleId: string; // Logical vehicle ID (e.g. "VEH-001")
  timestamp: string;
  cameraId: string;
  source: EventSource;
  metadata: {
    plateNumber?: string | null;
    plateConfidence?: number | null;
    spaceId?: string | null;
    zone?: string | null;
    trackId?: number;
    frameId?: number;
    message?: string;
    wasReserved?: boolean;
    durationSeconds?: number;
    [key: string]: unknown;
  };
}
