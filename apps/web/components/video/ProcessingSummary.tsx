import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { VideoUploadSnapshot } from "@/components/processing/VideoUpload";
import { CAMERA_STATUS_META, READY_LABEL } from "./cameraStatus";

/** Format a backend processing time (ms) for display. Returns "--" when absent. */
function formatProcessingTime(ms?: number): string {
  if (ms == null || !Number.isFinite(ms)) return "--";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Format a numeric metric, or "--" when the backend has not produced it yet. */
function metric(value: number | undefined): string {
  return value == null ? "--" : formatNumber(value);
}

/**
 * Processing Summary (Module 6 — Phase 5).
 *
 * Shows the run metrics the backend returns for a processed video, including
 * a scrollable list of every UNIQUE license plate string recognised during the
 * run. Values that the backend has not produced yet are shown as "--".
 */
export function ProcessingSummary({ snapshot }: { snapshot: VideoUploadSnapshot }) {
  const meta = CAMERA_STATUS_META[snapshot.status];
  const statusLabel =
    snapshot.status === "waiting" && snapshot.file ? READY_LABEL : meta.label;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Processing Time", value: formatProcessingTime(snapshot.processingTimeMs) },
    { label: "Frames Processed", value: metric(snapshot.framesProcessed) },
    { label: "Vehicles Detected", value: metric(snapshot.vehiclesDetected) },
    { label: "License Plates", value: metric(snapshot.licensePlates) },
    { label: "Current Status", value: statusLabel },
  ];

  const plates = snapshot.uniquePlates ?? [];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd
              className={cn(
                "text-sm font-medium tabular-nums text-foreground",
                row.label === "Current Status" && "truncate"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Unique license plate list — only rendered after a completed run */}
      {plates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
            Unique Plates ({plates.length})
          </p>
          <div
            className="flex flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2"
            style={{ maxHeight: "160px" }}
            aria-label="Unique license plates detected"
          >
            {plates.map((plate) => (
              <span
                key={plate}
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider",
                  "bg-primary/10 text-primary border border-primary/20 select-all"
                )}
                title={plate}
              >
                {plate}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
