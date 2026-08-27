"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  Film,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Car,
  LogIn,
  LogOut,
  ParkingSquare,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type CameraRole,
  type JourneyUploadResult,
} from "@/services/journey";
import { resolveBackendUrl } from "@/services/anpr";
import { useJourneyStationStore } from "@/store/useJourneyStationStore";
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";

interface CameraStationProps {
  role: CameraRole;
  title: string;
  description: string;
  onSuccess?: (result: JourneyUploadResult) => void;
}

const ROLE_CONFIG: Record<
  CameraRole,
  {
    icon: LucideIcon;
    badgeLabel: string;
    badgeClass: string;
    borderClass: string;
    accentBg: string;
  }
> = {
  entry: {
    icon: LogIn,
    badgeLabel: "ENTRY STATION",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    borderClass: "hover:border-emerald-500/50",
    accentBg: "bg-emerald-500/10 text-emerald-500",
  },
  parking: {
    icon: ParkingSquare,
    badgeLabel: "PARKING STATION",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    borderClass: "hover:border-amber-500/50",
    accentBg: "bg-amber-500/10 text-amber-500",
  },
  exit: {
    icon: LogOut,
    badgeLabel: "EXIT STATION",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    borderClass: "hover:border-rose-500/50",
    accentBg: "bg-rose-500/10 text-rose-500",
  },
};

const ACCEPTED_EXTENSIONS = ["mp4", "avi", "mov"];

export function CameraUploadStation({
  role,
  title,
  description,
  onSuccess,
}: CameraStationProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  const jobId = `journey:${role}`;
  const globalJob = useGlobalProcessingStore((state) => state.jobs[jobId]);
  const addJob = useGlobalProcessingStore((state) => state.addJob);
  const removeJob = useGlobalProcessingStore((state) => state.removeJob);
  const cancelJob = useGlobalProcessingStore((state) => state.cancelJob);

  const stationData = useJourneyStationStore((state) => state.stations[role]);
  const setStationResult = useJourneyStationStore((state) => state.setStationResult);
  const clearStationResult = useJourneyStationStore((state) => state.clearStationResult);
  const storedPreferredSlot = useJourneyStationStore(
    (state) => state.preferredSlots[role] || ""
  );
  const setStoredPreferredSlot = useJourneyStationStore(
    (state) => state.setPreferredSlot
  );

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preferredSlot, setPreferredSlot] = useState<string>(storedPreferredSlot);

  useEffect(() => {
    if (storedPreferredSlot && !preferredSlot) {
      setPreferredSlot(storedPreferredSlot);
    }
  }, [storedPreferredSlot, preferredSlot]);

  useEffect(() => {
    if (file && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
    return undefined;
  }, [file]);

  // Sync global job success to local station store
  useEffect(() => {
    if (globalJob && globalJob.status === "completed" && globalJob.result) {
      const res = globalJob.result as JourneyUploadResult;
      setStationResult(role, res, globalJob.fileName);
      onSuccess?.(res);
    }
  }, [globalJob, role, setStationResult, onSuccess]);

  const processing =
    Boolean(globalJob) &&
    (globalJob?.status === "queued" ||
      globalJob?.status === "uploading" ||
      globalJob?.status === "processing");

  const uploadPct = globalJob ? globalJob.uploadPct : null;

  const handleSelect = (selected: File | null | undefined) => {
    setFileError(null);
    if (!selected) return;
    const ext = selected.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFile(null);
      setFileError("Please upload an mp4, avi, or mov video.");
      return;
    }
    setFile(selected);
    addJob(jobId, "journey_station", role, selected, preferredSlot);
  };

  const handleRemove = () => {
    removeJob(jobId);
    clearStationResult(role);
    setFile(null);
    setFileError(null);
  };

  const handleSlotChange = (slot: string) => {
    setPreferredSlot(slot);
    setStoredPreferredSlot(role, slot);
  };

  const activeResult: JourneyUploadResult | null =
    (globalJob?.result as JourneyUploadResult) || stationData?.result || null;
  const displayFileName =
    file?.name || globalJob?.fileName || stationData?.fileName || null;
  const hasActiveSession = Boolean(file || globalJob || stationData);
  const annotatedVideoUrl = resolveBackendUrl(activeResult?.annotated_video_url);

  return (
    <Card className="flex flex-col justify-between overflow-hidden border border-border/80 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                config.accentBg
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold tracking-wider uppercase",
              config.badgeClass
            )}
          >
            {config.badgeLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-0">
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.avi,.mov,video/mp4,video/avi,video/quicktime"
          className="hidden"
          onChange={(e) => handleSelect(e.target.files?.[0])}
          disabled={processing}
        />

        {/* Drop zone - shown when no active file or stored result */}
        {!hasActiveSession && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleSelect(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border/70 bg-background/50 p-4 text-center transition-all",
              isDragging
                ? "border-primary bg-primary/5 scale-[0.99]"
                : config.borderClass
            )}
          >
            <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-xs font-medium text-foreground">
              {isDragging ? "Drop footage here" : "Upload Station Footage"}
            </p>
            <p className="text-[11px] text-muted-foreground">.mp4, .avi, or .mov</p>
          </div>
        )}

        {/* Selected file preview / active or restored result */}
        {hasActiveSession && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/60 px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-2 truncate">
                <Film className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-foreground">
                  {displayFileName || "Footage"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleRemove}
                disabled={processing}
                aria-label="Remove footage"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {previewUrl && !activeResult && (
              <video
                src={previewUrl}
                controls
                preload="metadata"
                className="max-h-24 w-full rounded border border-border bg-black object-cover"
              />
            )}

            {/* Optional slot selector for parking station */}
            {role === "parking" && !processing && !activeResult && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Assign Slot:</span>
                <select
                  value={preferredSlot}
                  onChange={(e) => handleSlotChange(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground font-medium"
                >
                  <option value="">⚡ Auto-Assign (First Free)</option>
                  <optgroup label="Row A (P01–P05)">
                    {["P01", "P02", "P03", "P04", "P05"].map((s) => (
                      <option key={s} value={s}>
                        Slot {s} (Row A)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Row B (P06–P10)">
                    {["P06", "P07", "P08", "P09", "P10"].map((s) => (
                      <option key={s} value={s}>
                        Slot {s} (Row B)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Processing state */}
            {processing && (
              <div className="flex items-center justify-between rounded-md border border-border/80 bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  <span>
                    {uploadPct !== null && uploadPct < 100
                      ? `Uploading… ${uploadPct}%`
                      : "Running ANPR & Tracking Pipeline…"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelJob(jobId)}
                  className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Stop
                </Button>
              </div>
            )}

            {/* Success result display (mutation completed or restored from store) */}
            {activeResult && (
              <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    ANPR Complete
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {activeResult.frames_processed} frames (
                    {Math.round(activeResult.processing_time_ms)}ms)
                  </span>
                </div>

                {/* Detected plates badges */}
                <div className="flex flex-wrap gap-1.5">
                  {activeResult.detected_plates &&
                  activeResult.detected_plates.length > 0 ? (
                    activeResult.detected_plates.map((p, idx) => (
                      <div
                        key={`${p.license_plate}-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded bg-background px-2 py-1 text-xs font-mono font-bold shadow-sm border border-border"
                      >
                        <Car className="h-3 w-3 text-primary" />
                        <span className="text-foreground">{p.license_plate}</span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 py-0 font-normal"
                        >
                          {p.vehicle_type || "Car"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No plate detected in sampled frames
                    </span>
                  )}
                </div>

                {/* Show updated journey snapshot */}
                {activeResult.journeys &&
                  activeResult.journeys.length > 0 &&
                  activeResult.journeys[0] && (
                    <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-border/50">
                      <span>
                        Status:{" "}
                        <strong className="capitalize text-foreground">
                          {activeResult.journeys[0].status}
                        </strong>
                      </span>
                      {activeResult.journeys[0].parking_slot && (
                        <span>
                          Slot:{" "}
                          <strong className="text-primary font-mono">
                            {activeResult.journeys[0].parking_slot}
                          </strong>
                        </span>
                      )}
                      {activeResult.journeys[0].duration_seconds && (
                        <span>
                          Duration:{" "}
                          <strong className="text-foreground font-mono">
                            {activeResult.journeys[0].duration_seconds}s
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                {/* Annotated video preview */}
                {annotatedVideoUrl && (
                  <div className="pt-1">
                    <video
                      src={annotatedVideoUrl}
                      controls
                      preload="metadata"
                      className="max-h-28 w-full rounded border border-border bg-black object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error display */}
            {globalJob?.status === "failed" && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {globalJob.error || "Station processing failed."}
                </span>
              </div>
            )}
          </div>
        )}

        {fileError && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {fileError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

