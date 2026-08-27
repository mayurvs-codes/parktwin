/**
 * Domain types for Analytics (Module 6 – Phase F).
 *
 * These mirror the response shapes returned by the backend **`/analytics`**
 * router (see PROJECT_MEMORY.md §7). The frontend consumes the Analytics
 * Engine vocabulary verbatim — it performs **NO** analytics math (occupancy
 * rate, traffic counts, duration distributions, utilization, and percentiles
 * are all computed backend-side). Fields are nullable where the engine may
 * omit them so the UI can degrade gracefully.
 *
 * Endpoints:
 *   GET /analytics/occupancy   → OccupancyAnalyticsDTO
 *   GET /analytics/traffic     → TrafficAnalyticsDTO
 *   GET /analytics/utilization → UtilizationAnalyticsDTO
 *   GET /analytics/trends      → TrendsDTO
 *   GET /analytics/dashboard   → AnalyticsDashboardDTO (combined)
 */

/** `GET /analytics/occupancy` — current occupancy analytics. */
export interface OccupancyAnalyticsDTO {
  current_occupancy: number;
  occupancy_percentage: number;
  free_slots: number;
  reserved_slots: number;
  unknown_slots: number;
  average_occupancy: number;
  average_occupancy_percentage: number;
  total_slots: number;
  /** Per-camera breakdown (shape is backend-owned; kept loose). */
  per_camera: Record<string, unknown>;
  query_start?: string;
  query_end?: string;
}

/** `GET /analytics/traffic` — traffic analytics. */
export interface TrafficAnalyticsDTO {
  vehicle_entries: number;
  vehicle_exits: number;
  active_vehicles: number;
  peak_hours: Array<number | null>;
  peak_hour: number | null;
  peak_hour_entries: number;
  /** Full 24-hour frame (00..23) → entries. JSON keys are strings. */
  hourly_traffic: Record<string, number>;
  daily_traffic: Array<{ date: string; entries: number }>;
  vehicle_counts: {
    total: number;
    distinct: number;
    active: number;
  };
  event_crosscheck: {
    entries: number;
    exits: number;
  };
  query_start?: string;
  query_end?: string;
}

/** `GET /analytics/utilization` — utilization analytics. */
export interface UtilizationAnalyticsDTO {
  slot_utilization: number;
  slot_utilization_percentage: number;
  used_slots: number;
  total_slots: number;
  average_parking_duration_seconds: number;
  /** Backend-formatted duration string (HH:MM:SS). */
  average_parking_duration: string;
  turnover_rate: number;
  most_used_slots: Array<{ slot_id: string | number; usage_count: number }>;
  least_used_slots: Array<{ slot_id: string | number; usage_count: number }>;
  statistics_crosscheck: {
    average_duration_seconds: number | null;
  };
  query_start?: string;
  query_end?: string;
}

/** A single occupancy snapshot on the trends timeline. */
export interface OccupancyTimelinePoint {
  timestamp: string;
  current_occupancy: number;
  occupancy_percentage: number;
  free_slots: number;
  reserved_slots: number;
}

/** A single traffic snapshot on the trends timeline. */
export interface TrafficTimelinePoint {
  timestamp: string;
  vehicle_entries: number;
  vehicle_exits: number;
  active_vehicles: number;
}

/** Duration distribution histogram (5-minute buckets, backend-computed). */
export interface DurationBucket {
  bucket_seconds: number;
  bucket_label: string;
  count: number;
}

/** `GET /analytics/trends` → duration_statistics. */
export interface DurationStatisticsDTO {
  count: number;
  min_seconds: number;
  max_seconds: number;
  mean_seconds: number;
  median_seconds: number;
  p25_seconds: number;
  p75_seconds: number;
  p90_seconds: number;
  distribution: DurationBucket[];
}

/** `GET /analytics/trends` → session_statistics. */
export interface SessionStatisticsDTO {
  total_sessions: number;
  active_sessions: number;
  closed_sessions: number;
  average_duration_seconds: number;
  average_duration: string;
  max_duration_seconds: number;
  max_duration: string;
  module2_crosscheck: {
    active_sessions: number | null;
    total_sessions: number | null;
    average_duration_seconds: number | null;
  };
}

/** `GET /analytics/trends` — combined trends payload. */
export interface TrendsDTO {
  occupancy_timeline: OccupancyTimelinePoint[];
  traffic_timeline: TrafficTimelinePoint[];
  session_statistics: SessionStatisticsDTO;
  duration_statistics: DurationStatisticsDTO;
  query_start?: string;
  query_end?: string;
  generated_at: string;
}

/** `GET /analytics/dashboard` — combined analytics dashboard (one round-trip). */
export interface AnalyticsDashboardDTO {
  occupancy: OccupancyAnalyticsDTO;
  traffic: TrafficAnalyticsDTO;
  utilization: UtilizationAnalyticsDTO;
  trends: TrendsDTO;
  query_start?: string;
  query_end?: string;
  generated_at: string;
}

