import type { VideoUploadStatus } from "@/components/processing/VideoUpload";

/**
 * The actual ParkTwin AI processing pipeline surfaced on every Camera Panel.
 *
 * This is a **visualization only** — it mirrors the backend's real ANPR
 * pipeline phases (Video → Vehicle Detection (YOLO) → Vehicle Tracking
 * (ByteTrack) → License Plate Detection → OCR → Parking Intelligence →
 * Database Update → Analytics → Completed). It does **not** fake backend
 * events: the "current step" is derived purely from the frontend upload/
 * processing lifecycle status (see `computePipelineStates`).
 */
export interface PipelineStage {
  /** Stable key (also the React key). */
  key: string;
  /** Human label shown in the camera panel. */
  label: string;
  /** Optional parenthetical qualifier, e.g. the model name. */
  detail?: string;
}

/** Ordered stages of the ParkTwin AI processing pipeline. */
export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "video", label: "Video" },
  { key: "detection", label: "Vehicle Detection", detail: "(YOLO)" },
  { key: "tracking", label: "Vehicle Tracking", detail: "(ByteTrack)" },
  { key: "plate", label: "License Plate Detection" },
  { key: "ocr", label: "OCR" },
  { key: "intelligence", label: "Parking Intelligence" },
  { key: "database", label: "Database Update" },
  { key: "analytics", label: "Analytics" },
  { key: "completed", label: "Completed" },
];

/** Visual state of a single pipeline stage. */
export type StageState = "pending" | "active" | "completed" | "failed";

/**
 * Map a frontend upload/processing status to a per-stage visual state.
 *
 * The backend emits no per-step events, so the "current step" is inferred
 * from the lifecycle status only:
 * - `waiting` / `uploading` → the Video input is the active stage.
 * - `processing` → Video is done; Vehicle Detection is active (the example
 *   callout in the phase spec highlights Vehicle Detection while processing).
 * - `completed` → every stage (including Completed) is done.
 * - `failed` → the in-flight stage is marked failed (we only know it failed,
 *   not exactly where, so it lands on Vehicle Detection).
 *
 * No stage is ever presented as "completed" for data the backend has not
 * produced — this is purely a status-driven indicator.
 */
export function computePipelineStates(status: VideoUploadStatus): StageState[] {
  let completedThrough = -1;
  let activeIndex = 0;
  let failed = false;

  switch (status) {
    case "waiting":
    case "uploading":
      completedThrough = -1;
      activeIndex = 0;
      break;
    case "processing":
      completedThrough = 0;
      activeIndex = 1;
      break;
    case "completed":
      completedThrough = PIPELINE_STAGES.length - 1;
      activeIndex = -1;
      break;
    case "failed":
      completedThrough = 0;
      activeIndex = 1;
      failed = true;
      break;
  }

  return PIPELINE_STAGES.map((_, i) => {
    if (i <= completedThrough) return "completed";
    if (i === activeIndex) return failed ? "failed" : "active";
    return "pending";
  });
}
