"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Play,
  Upload,
  UploadCloud,
  X,
  ScanText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
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
import {
  resolveBackendUrl,
  type AnprUploadResult,
  type DetectedPlate,
} from "@/services/anpr";
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCEPTED_EXTENSIONS = ["mp4", "avi", "mov"];
const FILE_ACCEPT = ".mp4,.avi,.mov,video/mp4,video/avi,video/quicktime";

function isAcceptedFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_EXTENSIONS.includes(ext);
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DownloadButton({
  href,
  label,
  filename,
}: {
  href: string | null;
  label: string;
  filename: string;
}) {
  if (!href) return null;
  return (
    <a href={href} download={filename} className="inline-flex">
      <Button variant="outline" size="sm" type="button">
        <Download className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    </a>
  );
}

function PlateTable({ plates }: { plates: DetectedPlate[] }) {
  if (plates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No unique vehicles were detected in this video.
      </p>
    );
  }

  const recognizedCount = plates.filter(
    (p) => p.license_plate && p.license_plate !== "NOT_DETECTED"
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {plates.length} unique vehicle{plates.length !== 1 ? "s" : ""}</span>
        <span>{recognizedCount} license plate{recognizedCount !== 1 ? "s" : ""} recognized</span>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm" aria-label="Detected unique vehicles and license plates">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Vehicle #
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                License Plate
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Confidence
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Vehicle Type
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Color
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Brand
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                OCR Engine
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plates.map((p, i) => {
              const isDetected = p.license_plate && p.license_plate !== "NOT_DETECTED";
              const trackId = (p as unknown as Record<string, unknown>).tracking_id as number ?? i + 1;
              return (
                <tr key={`${p.license_plate}-${trackId}-${i}`} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    <Badge variant="outline">#{trackId}</Badge>
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-foreground">
                    {isDetected ? (
                      <span className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-0.5 text-primary">
                        {p.license_plate}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">
                        Not Recognized
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isDetected ? (
                      <Badge
                        variant={p.plate_confidence >= 0.7 ? "default" : "secondary"}
                      >
                        {(p.plate_confidence * 100).toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-foreground font-medium">
                    {p.vehicle_type || "Vehicle"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.color || "Unknown"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.brand || "Unknown"}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs font-mono">
                    {isDetected ? p.ocr_engine : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export default function AnprPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const jobId = "anpr:single";

  const globalJob = useGlobalProcessingStore((state) => state.jobs[jobId]);
  const addJob = useGlobalProcessingStore((state) => state.addJob);
  const removeJob = useGlobalProcessingStore((state) => state.removeJob);
  const cancelJob = useGlobalProcessingStore((state) => state.cancelJob);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke the object URL when the file changes to avoid memory leaks
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

  const status = globalJob?.status === "failed"
    ? "failed"
    : globalJob?.status === "completed"
    ? "completed"
    : processing
    ? uploadPct != null
      ? "uploading"
      : "processing"
    : "waiting";

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
  };

  const handleProcess = () => {
    if (!file || processing) return;
    addJob(jobId, "anpr_single", "single", file);
  };

  // Resolved absolute URLs for media / download
  const data = (globalJob?.result as AnprUploadResult) || null;
  const annotatedVideoAbsUrl = resolveBackendUrl(data?.annotated_video_url);
  const csvAbsUrl = resolveBackendUrl(data?.csv_url);
  const jsonAbsUrl = resolveBackendUrl(data?.json_url);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScanText}
        title="ANPR"
        subtitle="Automated number-plate recognition, vehicle OCR pipeline, and confidence telemetry"
        badge={
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            OCR Engine
          </span>
        }
      />

      {/* Upload card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UploadCloud className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <CardTitle>Upload Video</CardTitle>
              <CardDescription>
                Accepts .mp4, .avi, and .mov files. The same ANPR pipeline used
                by Demo Mode processes your video.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={FILE_ACCEPT}
            id="anpr-video-input"
            className="hidden"
            onChange={(e) => handleSelect(e.target.files?.[0])}
            disabled={processing}
          />

          {/* Drag & drop zone */}
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
              id="anpr-browse-btn"
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

          {/* Selected file display */}
          {file && (
            <div className="space-y-3">
              {previewUrl && (
                <video
                  src={previewUrl}
                  controls
                  preload="metadata"
                  className="max-h-48 w-full rounded-md border border-border bg-black"
                  aria-label={`Preview of ${file.name}`}
                />
              )}
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
                  aria-label="Remove selected video"
                  id="anpr-remove-btn"
                  onClick={handleRemove}
                  disabled={processing}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>

              <Button
                id="anpr-process-btn"
                onClick={handleProcess}
                disabled={!file || processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Play className="h-4 w-4" aria-hidden />
                )}
                {processing ? "Processing…" : "Process Video"}
              </Button>
            </div>
          )}

          {/* Validation error */}
          {fileError && (
            <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              {fileError}
            </p>
          )}

          {/* Progress indicator */}
          {processing && (
            <div className="flex items-center justify-between rounded-md border border-border bg-accent/40 px-3 py-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                <span>
                  {status === "uploading" && uploadPct != null && uploadPct < 100
                    ? `Uploading… ${uploadPct}%`
                    : "Running ANPR pipeline…"}
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

          {/* Status badges */}
          {status !== "waiting" && !processing && (
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  status === "completed"
                    ? "default"
                    : status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {status === "completed"
                  ? "✓ Completed"
                  : status === "failed"
                    ? "✗ Failed"
                    : status}
              </Badge>
            </div>
          )}

          {/* Processing error */}
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

      {/* Results section — only shown on success */}
      {status === "completed" && data && (
        <>
          {/* Summary metrics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <CardTitle>Processing Complete</CardTitle>
                  <CardDescription>
                    {data.frames_processed} frames · {data.vehicles_detected}{" "}
                    unique vehicle{data.vehicles_detected !== 1 ? "s" : ""} ·{" "}
                    {data.detected_plates.filter((p) => p.license_plate && p.license_plate !== "NOT_DETECTED").length}{" "}
                    recognized plate
                    {data.detected_plates.filter((p) => p.license_plate && p.license_plate !== "NOT_DETECTED").length !== 1 ? "s" : ""}{" "}
                    · {formatMs(data.processing_time_ms)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Annotated output video */}
          {annotatedVideoAbsUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Annotated Output Video</CardTitle>
                <CardDescription>
                  Bounding boxes, vehicle types, and license plate text overlaid
                  on every sampled frame.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <video
                  src={annotatedVideoAbsUrl}
                  controls
                  preload="metadata"
                  className="w-full rounded-md border border-border bg-black"
                  aria-label="Annotated output video"
                />
                <DownloadButton
                  href={annotatedVideoAbsUrl}
                  label="Download Annotated Video"
                  filename={`annotated_${data.run_id}.mp4`}
                />
              </CardContent>
            </Card>
          )}

          {/* Download outputs */}
          <Card>
            <CardHeader>
              <CardTitle>Download Results</CardTitle>
              <CardDescription>
                CSV contains one row per detection. JSON contains the full
                run payload including all records.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <DownloadButton
                href={csvAbsUrl}
                label="Download CSV"
                filename={`results_${data.run_id}.csv`}
              />
              <DownloadButton
                href={jsonAbsUrl}
                label="Download JSON"
                filename={`results_${data.run_id}.json`}
              />
            </CardContent>
          </Card>

          {/* Detected plates table */}
          <Card>
            <CardHeader>
              <CardTitle>Detected License Plates</CardTitle>
              <CardDescription>
                Unique plates recognized across all sampled frames, with
                confidence values and vehicle metadata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlateTable plates={data.detected_plates} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
