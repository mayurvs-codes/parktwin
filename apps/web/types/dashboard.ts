/**
 * Domain types for the Dashboard (Module 6 – Phase C).
 *
 * These mirror the response shapes returned by the backend **`/integration`**
 * gateway (see PROJECT_MEMORY.md §7). The frontend consumes the gateway's
 * vocabulary verbatim — it performs NO business math (occupancy rate, session
 * counts, durations are all computed backend-side). Fields are nullable where
 * the gateway may omit them so the UI can degrade gracefully.
 */

/** Current occupancy snapshot — `GET /integration/occupancy`. */
export interface OccupancyDTO {
  total_slots: number;
  free: number;
  occupied: number;
  reserved: number;
  unknown: number;
  occupancy_rate: number;
  per_camera: Record<string, unknown>;
}

/** Aggregate parking statistics — `GET /integration/statistics`. */
export interface StatisticsDTO {
  active_sessions: number;
  total_sessions: number;
  closed_sessions: number;
  average_duration_seconds: number;
  average_duration: string;
  max_duration_seconds: number;
  max_duration: string;
  events: Record<string, number>;
  total_events: number;
  top_plates: Array<{ license_plate: string; visits: number }>;
  violations: Record<string, number>;
}

/** Canonical integration event (`GET /integration/events?source=integration`). */
export interface IntegrationEventDTO {
  event_id: string;
  event_type: string;
  timestamp: string;
  camera_id?: string | null;
  payload: Record<string, unknown>;
}

/** `GET /integration/events` — envelope around the recent event feed. */
export interface EventsResponseDTO {
  source: string;
  events: IntegrationEventDTO[];
  counts_by_type?: Record<string, number>;
}

/** Unified integration-layer health — `GET /integration/health`. */
export interface HealthDTO {
  status?: string;
  integration?: string;
  parking_engine_initialized: boolean;
  event_bus: string;
  event_counts: Record<string, number>;
  websocket_subscribers: Record<string, number>;
  occupancy: OccupancyDTO;
}

/** Detected vehicle (`GET /integration/vehicles`). */
export interface VehicleDTO {
  id?: string | null;
  license_plate?: string | null;
  vehicle_type?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  tracking_id?: number | null;
  plate_confidence?: number;
  detection_confidence?: number;
  color_confidence?: number;
  is_registered?: boolean;
  last_seen?: string | null;
  created_at?: string | null;
}

/** Presentation model for a single KPI tile on the dashboard. */
export interface KpiItem {
  key: string;
  label: string;
  value: string;
  /** Optional helper line under the value (e.g. "of 120 slots"). */
  hint?: string;
  /** Lucide icon name resolved by the card. */
  icon: KpiIconName;
  /** Optional semantic accent for the value/icon. */
  tone?: "default" | "success" | "warning" | "destructive";
}

export type KpiIconName =
  | "slots"
  | "occupied"
  | "available"
  | "sessions"
  | "vehicles"
  | "percent";

/** Severity used by the reusable Alert component. */
export type AlertSeverity = "info" | "success" | "warning" | "destructive";

/** A single alert entry surfaced in the Alerts panel. */
export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Optional ISO timestamp shown as relative/absolute time. */
  timestamp?: string;
}
