import { apiClient } from "@/services/api-client";

/**
 * Video processing transport.
 *
 * Thin, typed wrapper over the backend `POST /vehicles/process-video` endpoint
 * (PROJECT_MEMORY.md §7). That endpoint is the canonical Video → ANPR pipeline
 * → SQLite → REST flow for Module 1, and it also drives the Parking
 * Intelligence Engine through the Integration Service, so a single call
 * populates the Vehicles, Parking, Dashboard, and Analytics views.
 *
 * No business logic here — only multipart transport over the shared
 * `apiClient`. The backend owns all inference and persistence.
 */

export interface ProcessVideoResult {
  success: boolean;
  frames_processed: number;
  vehicles_detected: number;
  records?: unknown[];
  /** Server-computed sorted list of unique plate strings (preferred over client deduplication). */
  unique_plates?: string[];
  processing_time_ms?: number;
  camera_id?: string;
  active_sessions?: number;
  total_events?: number;
  occupancy?: unknown;
  /** Error detail when the backend returns `success: false`. */
  detail?: string;
}

export interface ProcessVideoOptions {
  /** Camera identifier sent as a query param (defaults to the backend's). */
  cameraId?: string;
  /** Upload progress callback (0–100). Fires during the file upload phase. */
  onUploadProgress?: (percent: number) => void;
  /** Optional abort signal to cancel upload and processing. */
  signal?: AbortSignal;
}

/**
 * Upload a video file and run it through the full detection pipeline.
 *
 * @param file  The selected video (.mp4 / .avi / .mov).
 * @returns     The backend's processing summary.
 */
export async function processVideo(
  file: File,
  options: ProcessVideoOptions = {}
): Promise<ProcessVideoResult> {
  const formData = new FormData();
  formData.append("video", file, file.name);

  const params: Record<string, string> = {};
  if (options.cameraId) params.camera_id = options.cameraId;

  const res = await apiClient.post<ProcessVideoResult>("/vehicles/process-video", formData, {
    params,
    // Browser XHR appends the multipart boundary automatically when the body is
    // FormData; setting the type (rather than the JSON default) keeps the
    // request valid for the backend's `UploadFile` field.
    headers: { "Content-Type": "multipart/form-data" },
    // Video processing can run long; disable the client timeout for this call
    // (the shared client default is 15s) so large videos aren't aborted.
    timeout: 0,
    signal: options.signal,
    onUploadProgress: (event) => {
      if (options.onUploadProgress && event.total) {
        options.onUploadProgress(Math.round((event.loaded / (event.total ?? 0)) * 100));
      }
    },
  });

  return res.data;
}
