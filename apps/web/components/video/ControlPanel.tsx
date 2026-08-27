"use client";

import {
  Car,
  CheckCircle2,
  Cog,
  Film,
  Loader2,
  Lock,
  Play,
  Plus,
  RotateCcw,
  ScanLine,
  Square,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VideoUploadSnapshot } from "@/components/processing/VideoUpload";
import type { CameraConfig } from "./cameraTypes";
import { DEFAULT_SNAPSHOT } from "./cameraTypes";

interface ControlPanelProps {
  cameras: CameraConfig[];
  snapshots: Record<string, VideoUploadSnapshot>;
  onAddCamera: () => void;
  onRemoveAll: () => void;
  onReset: () => void;
  onProcessAll?: () => void;
  isProcessingAll?: boolean;
  readyCount?: number;
  onStartAllRtsp?: () => void;
  onStopAllStreams?: () => void;
}

/** Classify a camera snapshot into one of the control-panel buckets. */
function classify(snapshot: VideoUploadSnapshot | undefined): keyof typeof COUNTS {
  const s = snapshot ?? DEFAULT_SNAPSHOT;
  if (s.status === "completed") return "completed";
  if (s.status === "failed") return "failed";
  if (s.status === "uploading" || s.status === "processing") return "processing";
  if (s.status === "waiting" && s.file) return "ready";
  return "idle";
}

const COUNTS = {
  idle: 0,
  ready: 0,
  processing: 0,
  completed: 0,
  failed: 0,
};

export function ControlPanel({
  cameras,
  snapshots,
  onAddCamera,
  onRemoveAll,
  onReset,
  onProcessAll,
  isProcessingAll = false,
  readyCount,
  onStartAllRtsp,
  onStopAllStreams,
}: ControlPanelProps) {
  const totals = { ...COUNTS };
  let totalVehicles = 0;
  let totalPlates = 0;
  for (const cam of cameras) {
    totals[classify(snapshots[cam.id])] += 1;
    const snap = snapshots[cam.id];
    if (snap?.vehiclesDetected != null) totalVehicles += snap.vehiclesDetected;
    if (snap?.licensePlates != null) totalPlates += snap.licensePlates;
  }

  const effectiveReadyCount = readyCount ?? totals.ready;

  const stats: Array<{ label: string; value: number; icon: LucideIcon; hint: string }> = [
    { label: "Total Cameras", value: cameras.length, icon: Video, hint: "cameras in the grid" },
    { label: "Ready", value: totals.ready, icon: Film, hint: "video selected, not yet processed" },
    { label: "Currently Processing", value: totals.processing, icon: Cog, hint: "uploading or processing" },
    { label: "Completed", value: totals.completed, icon: CheckCircle2, hint: "processing finished" },
    { label: "Failed", value: totals.failed, icon: Lock, hint: "last processing failed" },
    { label: "Total Vehicles", value: totalVehicles, icon: Car, hint: "detected across all cameras" },
    { label: "Total Plates", value: totalPlates, icon: ScanLine, hint: "license plates recognized" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                  <dt className="text-xs font-medium">{stat.label}</dt>
                </div>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {stat.value}
                </dd>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {stat.hint}
                </p>
              </div>
            );
          })}
        </dl>

        <p className="text-xs text-muted-foreground">
          Global Processing Summary — totals are summed from completed runs
          only; per-camera metrics that have not been produced yet show as
          &ldquo;--&rdquo; in each camera&rsquo;s Processing Summary.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {onProcessAll && (
            <Button
              variant="default"
              onClick={onProcessAll}
              disabled={isProcessingAll || effectiveReadyCount === 0}
              title={
                effectiveReadyCount === 0
                  ? "Select videos on ready cameras first"
                  : "Process all ready camera videos simultaneously"
              }
            >
              {isProcessingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              {isProcessingAll
                ? "Processing All…"
                : effectiveReadyCount > 0
                ? `Process All (${effectiveReadyCount})`
                : "Process All"}
            </Button>
          )}

          <Button variant="outline" onClick={onAddCamera}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Camera
          </Button>
          <Button variant="outline" onClick={onRemoveAll}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove All Cameras
          </Button>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset Cameras
          </Button>

          {onStartAllRtsp && (
            <Button variant="secondary" onClick={onStartAllRtsp}>
              <Play className="h-4 w-4" aria-hidden />
              Start All RTSP Streams
            </Button>
          )}

          {onStopAllStreams && (
            <Button variant="outline" onClick={onStopAllStreams}>
              <Square className="h-4 w-4" aria-hidden />
              Stop All Streams
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
