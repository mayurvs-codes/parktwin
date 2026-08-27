"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Loader2,
  Play,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProcessVideoResult } from "@/services/processing";

/** Accepted video extensions for the upload control. */
const ACCEPTED_EXTENSIONS = ["mp4", "avi", "mov"];
const FILE_ACCEPT = ".mp4,.avi,.mov,video/mp4,video/avi,video/quicktime";

/** Lifecycle states surfaced by the upload + processing flow. */
export type VideoUploadStatus =
  | "waiting"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

/** Read-only projection of the upload/processing state for sibling cards. */
export interface VideoUploadSnapshot {
  file: File | null;
  fileError: string | null;
  uploadPct: number | null;
  uploadedAt: string | null;
  status: VideoUploadStatus;
  framesProcessed?: number;
  vehiclesDetected?: number;
  /** Backend `processing_time_ms` for the completed run (undefined until success). */
  processingTimeMs?: number;
  /** License plates recognized this run, derived from the backend `records` payload. */
  licensePlates?: number;
  /** Sorted list of unique plate strings for display (e.g. ["KA09AB1234", "TS05JK7890"]). */
  uniquePlates?: string[];
  error?: string | null;
}

function isAcceptedFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_EXTENSIONS.includes(ext);
}

/**
 * Count the UNIQUE vehicles detected across all frames.
 * Deduplicates by ByteTrack tracking_id or license plate string.
 */
function countUniqueVehicles(records: unknown[] | undefined): number {
  if (!records || records.length === 0) return 0;
  const uniqueTracks = new Set<string>();
  for (const r of records) {
    const rec = r as { tracking_id?: number | string; record_id?: string; license_plate?: string; vehicle_number?: string } | null;
    if (!rec) continue;
    if (rec.tracking_id != null) {
      uniqueTracks.add(String(rec.tracking_id));
    } else if (rec.license_plate || rec.vehicle_number) {
      uniqueTracks.add(String(rec.license_plate || rec.vehicle_number));
    } else if (rec.record_id) {
      uniqueTracks.add(rec.record_id);
    }
  }
  return uniqueTracks.size;
}

/**
 * Return the sorted, deduplicated list of unique plate strings.
 */
function getUniquePlateList(records: unknown[] | undefined): string[] {
  if (!records || records.length === 0) return [];
  const seen = new Set<string>();
  for (const r of records) {
    const rec = r as { license_plate?: string; plate?: string; vehicle_number?: string; tracking_id?: number | string } | null;
    if (!rec) continue;
    const plateText = (rec.license_plate || rec.plate || rec.vehicle_number || "").toString().trim().toUpperCase();
    if (plateText) {
      seen.add(plateText);
    } else if (rec.tracking_id != null) {
      const tid = rec.tracking_id;
      seen.add(typeof tid === "number" ? `VEH-${String(tid).padStart(3, "0")}` : `VEH-${tid}`);
    }
  }
  return Array.from(seen).sort();
}

/**
 * Video processing card (Module 6 — Phase 2/3/4).
 *
 * Lets the operator pick a video (drag & drop or browse), then run it through
 * the backend pipeline. On success every Vehicles / Parking / Dashboard /
 * Analytics query is invalidated so those views re-fetch the freshly ingested
 * data. The UI reuses the project's Card / Button / Badge primitives and the
 * shared `apiClient`.
 *
 * This component remains the single owner of the upload/processing state for
 * ONE video source (e.g. one camera). Each instance is fully independent — its
 * React state (file, mutation, preview) is isolated from every other instance,
 * so multiple `VideoUpload` widgets (one per camera panel) never share state.
 *
 * It reports a read-only `VideoUploadSnapshot` via `onStateChange` so a parent
 * (the CCTV Control Center) can present per-camera status without holding a
 * duplicate copy of the state.
 */
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";

export interface VideoUploadProps {
  /** Camera identifier sent to the backend as a query param. */
  cameraId?: string;
  onStateChange?: (snapshot: VideoUploadSnapshot) => void;
  /** Ref attached by parent to imperatively trigger upload mutation. */
  onTriggerRef?: React.MutableRefObject<(() => Promise<ProcessVideoResult | undefined>) | null>;
}

export function VideoUpload({
  cameraId = "CAM_VIDEO",
  onStateChange,
  onTriggerRef,
}: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const jobId = `cctv:${cameraId}`;

  const globalJob = useGlobalProcessingStore((state) => state.jobs[jobId]);
  const addJob = useGlobalProcessingStore((state) => state.addJob);
  const removeJob = useGlobalProcessingStore((state) => state.removeJob);
  const cancelJob = useGlobalProcessingStore((state) => state.cancelJob);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
    return undefined;
  }, [file]);

  const processing =
    Boolean(globalJob) &&
    (globalJob?.status === "queued" ||
      globalJob?.status === "uploading" ||
      globalJob?.status === "processing");

  const uploadPct = globalJob ? globalJob.uploadPct : null;
  const resultData = (globalJob?.result as ProcessVideoResult) || null;

  const status: VideoUploadStatus = globalJob?.status === "failed"
    ? "failed"
    : globalJob?.status === "completed"
    ? "completed"
    : processing
    ? uploadPct != null
      ? "uploading"
      : "processing"
    : "waiting";

  useEffect(() => {
    const records = resultData?.records;
    const serverPlates = resultData?.unique_plates;
    const plateList: string[] | undefined = serverPlates
      ? serverPlates
      : records && records.length > 0
      ? getUniquePlateList(records)
      : undefined;

    onStateChange?.({
      file,
      fileError,
      uploadPct,
      uploadedAt,
      status,
      framesProcessed: resultData?.frames_processed,
      vehiclesDetected: records && records.length > 0 ? countUniqueVehicles(records) : resultData?.vehicles_detected,
      processingTimeMs: resultData?.processing_time_ms,
      licensePlates: plateList ? plateList.length : undefined,
      uniquePlates: plateList,
      error: globalJob?.error ?? null,
    });
  }, [
    file,
    fileError,
    uploadPct,
    uploadedAt,
    status,
    resultData,
    globalJob,
    onStateChange,
  ]);

  const handleSelect = (selected: File | null | undefined) => {
    setFileError(null);
    if (!selected) return;
    if (!isAcceptedFile(selected.name)) {
      setFile(null);
      setFileError("Unsupported file. Please choose an mp4, avi, or mov video.");
      return;
    }
    setFile(selected);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleSelect(event.dataTransfer.files?.[0]);
  };

  const handleRemove = () => {
    removeJob(jobId);
    setFile(null);
    setFileError(null);
    setUploadedAt(null);
  };

  const handleProcess = () => {
    if (!file || processing) return;
    setUploadedAt(
      new Date().toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
    addJob(jobId, "cctv_camera", cameraId, file);
  };

  useEffect(() => {
    if (onTriggerRef) {
      onTriggerRef.current = async () => {
        if (!file || processing) return undefined;
        setUploadedAt(
          new Date().toLocaleString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        addJob(jobId, "cctv_camera", cameraId, file);
        return undefined;
      };
    }
    return () => {
      if (onTriggerRef) {
        onTriggerRef.current = null;
      }
    };
  }, [onTriggerRef, file, processing, jobId, cameraId, addJob]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Film className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardTitle>Process Video</CardTitle>
            <CardDescription>
              Upload a parking-lot video (mp4, avi, or mov) and run it through the
              detection pipeline.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={(event) => handleSelect(event.target.files?.[0])}
          disabled={processing}
        />

        {/* Drag & drop zone — also clickable to browse. Accepts mp4/avi/mov
            via the same validation rules used by the file picker. */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag and drop a video here, or click to browse"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            isDragging
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50 hover:bg-accent/40"
          )}
        >
          <UploadCloud
            className={cn(
              "h-7 w-7",
              isDragging ? "text-primary" : "text-muted-foreground"
            )}
            aria-hidden
          />
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop video to upload" : "Drag & drop a video"}
          </p>
          <p className="text-xs text-muted-foreground">mp4, avi, or mov</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            disabled={processing}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Browse Video
          </Button>
        </div>

        {file && (
          <div className="space-y-3">
            {/* Video preview */}
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                preload="metadata"
                className="max-h-48 w-full rounded-md border border-border bg-black"
                aria-label={`Preview of ${file.name}`}
              />
            )}

            {/* Selected filename + file size + remove */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                <Film className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span
                  className="min-w-0 flex-1 truncate text-sm text-foreground"
                  title={file.name}
                >
                  {file.name}
                </span>
                <Badge variant="secondary">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove video"
                onClick={handleRemove}
                disabled={processing}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <Button onClick={handleProcess} disabled={!file || processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {processing ? "Processing…" : "Process Video"}
            </Button>
          </div>
        )}

        {fileError && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            {fileError}
          </p>
        )}

        {processing && (
          <div className="flex items-center justify-between rounded-md border border-border bg-accent/40 px-3 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              <span>
                {uploadPct != null && uploadPct < 100
                  ? `Uploading video… ${uploadPct}%`
                  : "Uploading and processing video…"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelJob(jobId)}
              className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Stop
            </Button>
          </div>
        )}

        {globalJob?.status === "completed" && resultData && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Processing complete</p>
              <p className="text-xs text-muted-foreground">
                {resultData.frames_processed} frame(s) processed ·{" "}
                {resultData.vehicles_detected} vehicle(s) detected. Vehicles, Parking,
                Dashboard, and Analytics have been refreshed.
              </p>
            </div>
          </div>
        )}

        {globalJob?.status === "failed" && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Processing failed</p>
              <p className="text-xs opacity-90">{globalJob.error || "The video could not be processed."}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
