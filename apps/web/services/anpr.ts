import { apiClient } from "@/services/api-client";

/**
 * ANPR Upload service.
 *
 * Thin, typed wrapper over the backend ``POST /api/v1/anpr/upload`` endpoint.
 * All inference, annotation, and export logic runs on the backend.  This
 * module only handles multipart transport using the shared `apiClient`.
 *
 * No business logic here — the backend owns the pipeline.
 */

/** A single recognized license plate entry in the processing result. */
export interface DetectedPlate {
  license_plate: string;
  plate_raw: string | null;
  plate_confidence: number;
  vehicle_type: string;
  brand: string;
  color: string;
  ocr_engine: string;
  frame_id: number;
  timestamp: string;
}

/** Full response returned by POST /api/v1/anpr/upload. */
export interface AnprUploadResult {
  success: boolean;
  run_id: string;
  frames_processed: number;
  vehicles_detected: number;
  processing_time_ms: number;
  /** Relative URL — served by FastAPI StaticFiles at /outputs/<file>. */
  annotated_video_url: string | null;
  /** Relative URL — served by FastAPI StaticFiles at /outputs/<file>. */
  csv_url: string | null;
  /** Relative URL — served by FastAPI StaticFiles at /outputs/<file>. */
  json_url: string | null;
  /** Unique plates detected, deduplicated by the backend. */
  detected_plates: DetectedPlate[];
  error: string | null;
}

export interface AnprUploadOptions {
  /** Upload progress callback (0–100). Fires during the upload phase only. */
  onUploadProgress?: (percent: number) => void;
  /** Optional abort signal to cancel upload and processing. */
  signal?: AbortSignal;
}

/**
 * Upload a parking-lot video and run it through the full ANPR pipeline.
 *
 * @param file   The selected video (.mp4 / .avi / .mov).
 * @returns      The backend processing result including file URLs and detected plates.
 */
export async function uploadAnprVideo(
  file: File,
  options: AnprUploadOptions = {}
): Promise<AnprUploadResult> {
  const formData = new FormData();
  formData.append("video", file, file.name);

  const res = await apiClient.post<AnprUploadResult>(
    "/api/v1/anpr/upload",
    formData,
    {
      // Let Axios and browser set multipart boundary properly
      headers: { "Content-Type": "multipart/form-data" },
      // Video processing can run many minutes on large files — disable the
      // client timeout for this call (the shared client default is 15 s).
      timeout: 0,
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
 * Resolve a relative backend static-file URL to an absolute URL.
 *
 * The backend serves uploads / outputs under its own origin, e.g.:
 *   /outputs/annotated_abc123.mp4  →  http://localhost:8000/outputs/annotated_abc123.mp4
 */
export function resolveBackendUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  // Strip trailing slash from base, ensure leading slash on path
  const base = apiBase.replace(/\/$/, "");
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}
