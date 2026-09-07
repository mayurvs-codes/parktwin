import { apiGet, apiPost } from "./api-client";

export interface VideoItem {
  id: string;
  filename: string;
  file_path: string;
  date: string;
  camera_id: string;
  duration_seconds: number;
  fps: number;
  resolution: string;
  file_size_bytes: number;
  processing_status: "IDLE" | "PROCESSING" | "COMPLETED" | "STOPPED" | "ERROR";
  processed_at: string | null;
  meta?: Record<string, unknown>;
  camera?: {
    id: string;
    name: string;
    role: "ENTRY" | "PARKING_LOT" | "EXIT" | "UNKNOWN";
    parking_area?: string;
    slot_group?: string;
  };
  progress?: {
    status: string;
    progress_pct: number;
    processed_frames: number;
    total_frames: number;
    fps: number;
    estimated_remaining_s: number;
    detections: number;
  };
}

export interface VideoHierarchy {
  dates: Record<string, Record<string, VideoItem[]>>;
  total_count: number;
}

export interface CameraDesignationUpdate {
  role: "ENTRY" | "PARKING_LOT" | "EXIT" | "UNKNOWN";
  parking_area?: string;
  slot_group?: string;
  coverage_meta?: Record<string, unknown>;
}

export interface VehicleRouteWaypoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface VehicleRouteResponse {
  vehicle_id: string;
  license_plate: string;
  source: string;
  destination: string;
  destination_slot: string;
  distance_meters: number;
  path: string[];
  waypoints: VehicleRouteWaypoint[];
  directions: string[];
}

export interface VehicleTimelineEvent {
  timestamp: string;
  camera_id: string;
  event_type: string;
  slot_id: string | null;
  description: string;
  source_video: string | null;
  confidence: number;
  evidence_crop: string | null;
}

export interface VehicleTimelineResponse {
  vehicle_id: string;
  license_plate: string;
  vehicle_type: string;
  brand: string;
  model: string;
  color: string;
  status: string;
  evidence_car_crop: string | null;
  evidence_plate_crop: string | null;
  timeline: VehicleTimelineEvent[];
}

/** Fetch video hierarchy: Date -> Camera -> Video list */
export async function fetchVideoHierarchy(): Promise<VideoHierarchy> {
  return apiGet<VideoHierarchy>("/videos?hierarchical=true");
}

/** Fetch single video details + live processing status */
export async function fetchVideoDetails(videoId: string): Promise<VideoItem> {
  return apiGet<VideoItem>(`/videos/${encodeURIComponent(videoId)}`);
}

/** Trigger CV processing on a video */
export async function processVideo(videoId: string): Promise<{ status: string; task_id?: string; message: string }> {
  return apiPost<{ status: string; task_id?: string; message: string }>(`/videos/${encodeURIComponent(videoId)}/process`);
}

/** Stop active CV processing on a video */
export async function stopVideoProcessing(videoId: string): Promise<{ status: string; message: string }> {
  return apiPost<{ status: string; message: string }>(`/videos/${encodeURIComponent(videoId)}/stop`);
}

/** Update camera role designation */
export async function updateCameraDesignation(
  cameraId: string,
  designation: CameraDesignationUpdate
): Promise<{ status: string; camera_id: string; role: string; parking_area: string; slot_group: string }> {
  return apiPost(`/cameras/${encodeURIComponent(cameraId)}/designation`, designation);
}

/** Fetch vehicle Dijkstra route */
export async function fetchVehicleRoute(
  vehicleIdOrPlate: string,
  source?: string
): Promise<VehicleRouteResponse> {
  const url = `/navigation/vehicle/${encodeURIComponent(vehicleIdOrPlate)}${
    source ? `?source=${encodeURIComponent(source)}` : ""
  }`;
  return apiGet<VehicleRouteResponse>(url);
}

/** Fetch complete vehicle timeline and evidence */
export async function fetchVehicleTimeline(
  vehicleIdOrPlate: string
): Promise<VehicleTimelineResponse> {
  return apiGet<VehicleTimelineResponse>(`/vehicles/${encodeURIComponent(vehicleIdOrPlate)}/timeline`);
}
