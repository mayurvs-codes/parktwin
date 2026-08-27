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
}

/** Neutral snapshot used before a camera reports any state. */
export const DEFAULT_SNAPSHOT: VideoUploadSnapshot = {
  file: null,
  fileError: null,
  uploadPct: null,
  uploadedAt: null,
  status: "waiting",
};

/** The four cameras the CCTV Control Center opens with. */
export const INITIAL_CAMERAS: CameraConfig[] = [
  { id: "CAM-001", name: "Entrance Gate", source: "upload" },
  { id: "CAM-002", name: "Exit Gate", source: "upload" },
  { id: "CAM-003", name: "Parking Zone A", source: "upload" },
  { id: "CAM-004", name: "Parking Zone B", source: "upload" },
];

/** Format a 1-based camera number as a stable `CAM-0NN` identifier. */
export function formatCameraId(n: number): string {
  return `CAM-${String(n).padStart(3, "0")}`;
}
