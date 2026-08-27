import { apiClient, apiGet } from "@/services/api-client";
import { type DetectedPlate } from "@/services/anpr";

export type CameraRole = "entry" | "parking" | "exit";
export type JourneyStatus = "entering" | "parked" | "exited";

export interface VehicleJourney {
  id: string;
  license_plate: string;
  vehicle_type: string;
  color: string;
  brand: string;
  vehicle_snapshot_path: string | null;
  entry_time: string | null;
  entry_camera_id: string | null;
  entry_confidence: number;
  parked_at: string | null;
  parking_camera_id: string | null;
  parking_slot: string | null;
  exit_time: string | null;
  exit_camera_id: string | null;
  duration_seconds: number | null;
  status: JourneyStatus;
  created_at: string | null;
  updated_at: string | null;
}

export interface JourneyStats {
  entering: number;
  parked: number;
  exited: number;
  total: number;
}

export interface JourneyUploadResult {
  success: boolean;
  camera_role: CameraRole;
  camera_id: string;
  frames_processed: number;
  vehicles_detected: number;
  processing_time_ms: number;
  annotated_video_url: string | null;
  csv_url: string | null;
  json_url: string | null;
  detected_plates: DetectedPlate[];
  journeys: VehicleJourney[];
  error?: string | null;
}

export interface JourneyUploadOptions {
  preferredSlot?: string;
  onUploadProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Upload CCTV footage for a specific camera station (Entry, Parking, Exit).
 */
export async function uploadStationVideo(
  file: File,
  cameraRole: CameraRole,
  options: JourneyUploadOptions = {}
): Promise<JourneyUploadResult> {
  const formData = new FormData();
  formData.append("video", file, file.name);
  formData.append("camera_role", cameraRole);
  if (options.preferredSlot) {
    formData.append("preferred_slot", options.preferredSlot);
  }

  const res = await apiClient.post<JourneyUploadResult>(
    "/api/v1/journey/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 0, // Video processing can take some time
      signal: options.signal,
      onUploadProgress: (event) => {
        if (options.onUploadProgress && event.total) {
          options.onUploadProgress(
            Math.round((event.loaded / event.total) * 100)
          );
        }
      },
    }
  );

  return res.data;
}

/**
 * Fetch all tracked vehicle journeys.
 */
export async function fetchAllJourneys(status?: JourneyStatus): Promise<VehicleJourney[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<VehicleJourney[]>(`/api/v1/journey/all${query}`);
}

/**
 * Fetch journey summary statistics.
 */
export async function fetchJourneyStats(): Promise<JourneyStats> {
  return apiGet<JourneyStats>("/api/v1/journey/stats");
}

/**
 * Fetch journey details for a specific license plate.
 */
export async function fetchJourneyByPlate(plate: string): Promise<VehicleJourney> {
  return apiGet<VehicleJourney>(`/api/v1/journey/${encodeURIComponent(plate)}`);
}
