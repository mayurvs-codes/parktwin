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
  is_registered?: boolean;
  last_seen?: string | null;
  created_at?: string | null;
}
