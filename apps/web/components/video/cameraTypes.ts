import type { VideoUploadSnapshot } from "@/components/processing/VideoUpload";

/**
 * A camera's video source. Today only `upload` (an uploaded video file) is
 * implemented. The other kinds are reserved so the CCTV Control Center UI can
 * later surface RTSP / IP / USB camera feeds **without redesigning the panel**:
 * each source type becomes an alternative render of the same `CameraPanel`
 * shell (the upload dropzone is simply swapped for a live feed view).
 *
 * See PROJECT_MEMORY.md §15.x (CCTV Control Center) for the future-architecture
 * intent. Live camera capture is NOT implemented in this phase.
 */
export type CameraSource = "upload" | "rtsp" | "ip" | "usb";

/** Human-readable label for a camera source type (future live feeds reserved). */
export const CAMERA_SOURCE_LABEL: Record<CameraSource, string> = {
  upload: "Uploaded Video",
  rtsp: "RTSP Camera",
  ip: "IP Camera",
  usb: "USB Camera",
};

/** A single camera in the CCTV Control Center grid. */
export interface CameraConfig {
  /** Stable unique identifier, e.g. `CAM-001`. Used as the React key + status map key. */
  id: string;
  /** Operator-facing name (editable in the UI). */
  name: string;
  /** Video source kind. Only `upload` is wired up today. */
  source: CameraSource;
  role?: "ENTRY" | "PATH_PARKING" | "EXIT";
  zone?: string;
  isConfigured?: boolean;
}

/** Neutral snapshot used before a camera reports any state. */
export const DEFAULT_SNAPSHOT: VideoUploadSnapshot = {
  file: null,
  fileError: null,
  uploadPct: null,
  uploadedAt: null,
  status: "waiting",
};

/** The active cameras the CCTV Control Center starts with. */
export const INITIAL_CAMERAS: CameraConfig[] = [
  { id: "CAM-01", name: "CAM-01 · Entry Gate", source: "upload", role: "ENTRY", zone: "entry", isConfigured: true },
  { id: "CAM-02", name: "CAM-02 · Path & Parking Cam 1", source: "upload", role: "PATH_PARKING", zone: "parking", isConfigured: true },
  { id: "CAM-03", name: "CAM-03 · Path & Parking Cam 2", source: "upload", role: "PATH_PARKING", zone: "parking", isConfigured: true },
  { id: "CAM-16", name: "CAM-16 · Exit Gate (Reserved)", source: "upload", role: "EXIT", zone: "exit", isConfigured: false },
];

/** Full 16-camera facility architecture registry */
export const CANONICAL_16_CAMERAS: CameraConfig[] = [
  { id: "CAM-01", name: "Entry Gate Cam", role: "ENTRY", zone: "entry", isConfigured: true, source: "upload" },
  { id: "CAM-02", name: "Path & Parking Cam 1", role: "PATH_PARKING", zone: "parking", isConfigured: true, source: "upload" },
  { id: "CAM-03", name: "Path & Parking Cam 2", role: "PATH_PARKING", zone: "parking", isConfigured: true, source: "upload" },
  { id: "CAM-04", name: "North-West Transit Lane", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-05", name: "South Ramp Inbound", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-06", name: "North-West Corner", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-07", name: "South-West Boundary", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-08", name: "Drive Aisle 1", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-09", name: "Drive Aisle 2", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-10", name: "Drive Aisle 3", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-11", name: "East Core Corridor", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-12", name: "North Perimeter", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-13", name: "Pedestrian Junction A", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-14", name: "Pedestrian Junction B", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-15", name: "Exit Approach Lane", role: "PATH_PARKING", zone: "parking", isConfigured: false, source: "upload" },
  { id: "CAM-16", name: "Exit Gate Cam", role: "EXIT", zone: "exit", isConfigured: false, source: "upload" },
];

/** Format a 1-based camera number as a stable `CAM-0N` identifier. */
export function formatCameraId(n: number): string {
  return `CAM-${String(n).padStart(2, "0")}`;
}
