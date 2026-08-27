export interface OccupancyDTO {
  total_slots: number;
  free: number;
  occupied: number;
  reserved: number;
  unknown: number;
  occupancy_rate: number;
  per_camera: Record<string, unknown>;
}

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
}
