"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Film,
  Play,
  Square,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/ui/SourceBadge";
import {
  fetchVideoHierarchy,
  fetchVideoDetails,
  processVideo,
  stopVideoProcessing,
  updateCameraDesignation,
  type VideoItem,
  type VideoHierarchy,
  type CameraDesignationUpdate,
} from "@/services/video-library";
import { getEnv } from "@/utils/env";
import Link from "next/link";
import { ROUTES } from "@/utils/routes";

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDurationSec(sec: number): string {
  if (!sec || isNaN(sec)) return "00:00";
  const mins = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
}

export function VideoLibraryView() {
  const [hierarchy, setHierarchy] = useState<VideoHierarchy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingDesignation, setSavingDesignation] = useState(false);

  // Form states for Camera Role Designation
  const [role, setRole] = useState<"ENTRY" | "PARKING_LOT" | "EXIT" | "UNKNOWN">("UNKNOWN");
  const [parkingArea, setParkingArea] = useState("Level B2");
  const [slotGroup, setSlotGroup] = useState("P01-P05");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const env = getEnv();
  const apiBase = env.apiBase || "http://localhost:8000";

  const loadHierarchy = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchVideoHierarchy();
      setHierarchy(data);

      // Default select first video if none selected
      if (!selectedVideo && data.dates) {
        const firstDate = Object.keys(data.dates)[0];
        if (firstDate && data.dates[firstDate]) {
          const camMap = data.dates[firstDate];
          const firstCam = Object.keys(camMap)[0];
          if (firstCam && camMap[firstCam]) {
            const firstVid = camMap[firstCam][0];
            if (firstVid) {
              setSelectedVideo(firstVid);
              setRole(firstVid.camera?.role || "UNKNOWN");
              setParkingArea(firstVid.camera?.parking_area || "Level B2");
              setSlotGroup(firstVid.camera?.slot_group || "P01-P05");
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load video library hierarchy:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedVideo]);

  useEffect(() => {
    void loadHierarchy();
  }, [loadHierarchy]);

  // When selected video changes, sync role designation form
  useEffect(() => {
    if (selectedVideo?.camera) {
      setRole(selectedVideo.camera.role || "UNKNOWN");
      setParkingArea(selectedVideo.camera.parking_area || "Level B2");
      setSlotGroup(selectedVideo.camera.slot_group || "P01-P05");
    }
  }, [selectedVideo?.id, selectedVideo?.camera]);

  // Polling for live video processing progress
  useEffect(() => {
    if (!selectedVideo) return;

    const checkStatus = async () => {
      try {
        const latest = await fetchVideoDetails(selectedVideo.id);
        setSelectedVideo((prev) => (prev?.id === latest.id ? latest : prev));
        const status = latest.processing_status;
        setIsProcessing(status === "PROCESSING");
      } catch {
        // silent catch
      }
    };

    if (isProcessing || selectedVideo.processing_status === "PROCESSING") {
      pollIntervalRef.current = setInterval(checkStatus, 2000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isProcessing, selectedVideo]);

  const handleSelectVideo = (video: VideoItem) => {
    setSelectedVideo(video);
    setProcessingError(null);
    setSaveSuccess(false);
    if (video.camera) {
      setRole(video.camera.role || "UNKNOWN");
      setParkingArea(video.camera.parking_area || "Level B2");
      setSlotGroup(video.camera.slot_group || "P01-P05");
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedVideo) return;
    try {
      setProcessingError(null);
      setIsProcessing(true);
      await processVideo(selectedVideo.id);
      const updated = await fetchVideoDetails(selectedVideo.id);
      setSelectedVideo(updated);
    } catch (err: unknown) {
      setIsProcessing(false);
      setProcessingError(err instanceof Error ? err.message : "Failed to start processing");
    }
  };

  const handleStopProcessing = async () => {
    if (!selectedVideo) return;
    try {
      await stopVideoProcessing(selectedVideo.id);
      setIsProcessing(false);
      const updated = await fetchVideoDetails(selectedVideo.id);
      setSelectedVideo(updated);
    } catch (err: unknown) {
      console.error("Failed to stop processing:", err);
    }
  };

  const handleSaveDesignation = async () => {
    if (!selectedVideo?.camera_id) return;
    try {
      setSavingDesignation(true);
      setSaveSuccess(false);
      const updateData: CameraDesignationUpdate = {
        role,
        parking_area: parkingArea,
        slot_group: slotGroup,
      };
      await updateCameraDesignation(selectedVideo.camera_id, updateData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);

      // Refresh video details to reflect new camera role
      const updated = await fetchVideoDetails(selectedVideo.id);
      setSelectedVideo(updated);
      void loadHierarchy();
    } catch (err: unknown) {
      console.error("Failed to save camera designation:", err);
    } finally {
      setSavingDesignation(false);
    }
  };

  const videoStreamUrl = useMemo(() => {
    if (!selectedVideo) return "";
    return `${apiBase}/videos/${encodeURIComponent(selectedVideo.id)}/stream`;
  }, [apiBase, selectedVideo]);

  const roleBadgeVariant = (r?: string) => {
    switch (r) {
      case "ENTRY":
        return "success";
      case "PARKING_LOT":
        return "default";
      case "EXIT":
        return "warning";
      default:
        return "outline";
    }
  };

  const statusBadgeVariant = (s?: string) => {
    switch (s) {
      case "COMPLETED":
        return "success";
      case "PROCESSING":
        return "warning";
      case "ERROR":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Film}
        title="Video"
        subtitle="Manage and play recorded CCTV footage used for processing and demonstration"
        badge={<SourceBadge source="mp4" />}
        rightSlot={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 bg-background font-mono text-[11px]">
              <Cpu className="h-3.5 w-3.5 text-amber-500" />
              <span>CPU Adaptive Subsampling</span>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadHierarchy()}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs font-mono"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Main Grid: Left Tree Navigation & Right Inspection Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Tree Browser (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>CCTV Recordings</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {hierarchy?.total_count ?? 0} files discovered
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Organized by Date &rarr; Camera &rarr; Recording
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-4 max-h-[720px] overflow-y-auto">
              {isLoading && !hierarchy ? (
                <div className="flex flex-col items-center justify-center p-8 gap-2">
                  <LoadingSpinner className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">Scanning videos...</span>
                </div>
              ) : hierarchy && Object.keys(hierarchy.dates).length > 0 ? (
                Object.entries(hierarchy.dates).map(([dateStr, camerasMap]) => (
                  <div key={dateStr} className="space-y-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/40 rounded">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{dateStr}</span>
                    </div>

                    <div className="space-y-3 pl-2">
                      {Object.entries(camerasMap).map(([camId, vids]) => (
                        <div key={camId} className="space-y-1">
                          <div className="flex items-center justify-between px-2 text-xs font-medium text-foreground">
                            <span className="font-mono">{camId}</span>
                            <Badge
                              variant={roleBadgeVariant(vids[0]?.camera?.role)}
                              className="text-[10px] px-1.5 py-0 uppercase"
                            >
                              {vids[0]?.camera?.role || "UNASSIGNED"}
                            </Badge>
                          </div>

                          <div className="space-y-1 pl-1">
                            {vids.map((vid) => {
                              const isSelected = selectedVideo?.id === vid.id;
                              return (
                                <button
                                  key={vid.id}
                                  type="button"
                                  onClick={() => handleSelectVideo(vid)}
                                  className={`w-full text-left p-2 rounded-md text-xs transition-all flex items-center justify-between ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                      : "hover:bg-accent text-foreground border border-border/40"
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <div className="truncate font-mono">{vid.filename}</div>
                                    <div
                                      className={`text-[10px] ${
                                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                      }`}
                                    >
                                      {formatDurationSec(vid.duration_seconds)} &bull;{" "}
                                      {formatBytes(vid.file_size_bytes)}
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      isSelected
                                        ? "secondary"
                                        : statusBadgeVariant(vid.processing_status)
                                    }
                                    className="text-[9px] px-1 py-0 shrink-0"
                                  >
                                    {vid.processing_status}
                                  </Badge>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-6 text-muted-foreground text-xs">
                  No video recordings found in storage directory.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Video Inspection, Player & Camera Role Designation (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedVideo ? (
            <>
              {/* Video Player Card */}
              <Card className="border border-border overflow-hidden">
                <div className="relative bg-black aspect-video flex items-center justify-center">
                  <video
                    key={selectedVideo.id}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain"
                    src={videoStreamUrl}
                  >
                    Your browser does not support HTML5 video streaming.
                  </video>

                  {/* Overlaid Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                    <SourceBadge source="mp4" />
                    <Badge className="bg-black/80 text-white border-white/20 font-mono text-xs">
                      {selectedVideo.camera_id}
                    </Badge>
                    <Badge
                      variant={roleBadgeVariant(selectedVideo.camera?.role)}
                      className="backdrop-blur-sm text-xs"
                    >
                      {selectedVideo.camera?.role || "ROLE UNASSIGNED"}
                    </Badge>
                  </div>
                </div>

                {/* Video Playback & CV Processing Toolbar */}
                <CardContent className="p-4 bg-card flex flex-wrap items-center justify-between gap-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    {isProcessing || selectedVideo.processing_status === "PROCESSING" ? (
                      <Button
                        variant="destructive"
                        onClick={handleStopProcessing}
                        className="flex items-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stop Processing
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStartProcessing}
                        className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Run CV Processing
                      </Button>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Badge variant={statusBadgeVariant(selectedVideo.processing_status)}>
                        {selectedVideo.processing_status}
                      </Badge>
                    </div>
                  </div>

                  {/* Quick Digital Twin link */}
                  <Link href={ROUTES.digitalTwin}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                      <span>View in Digital Twin</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Live Processing Telemetry Bar */}
              {(isProcessing || selectedVideo.progress) && (
                <Card className="border border-primary/40 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <LoadingSpinner className="h-3.5 w-3.5 text-primary" />
                        Inference Progress
                      </span>
                      <span className="font-mono text-primary font-bold">
                        {selectedVideo.progress?.progress_pct ?? 0}%
                      </span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${selectedVideo.progress?.progress_pct ?? 0}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-1">
                      <div>
                        Frames:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {selectedVideo.progress?.processed_frames ?? 0} /{" "}
                          {selectedVideo.progress?.total_frames ?? 0}
                        </span>
                      </div>
                      <div>
                        Inference Speed:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {selectedVideo.progress?.fps?.toFixed(1) ?? "0.0"} fps
                        </span>
                      </div>
                      <div>
                        Vehicles Detected:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {selectedVideo.progress?.detections ?? 0}
                        </span>
                      </div>
                      <div>
                        Est. Remaining:{" "}
                        <span className="font-mono font-medium text-foreground">
                          {formatDurationSec(selectedVideo.progress?.estimated_remaining_s ?? 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {processingError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{processingError}</span>
                </div>
              )}

              {/* Two Column Grid: Camera Role Designation & Video Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Panel 1: Camera Role Designation */}
                <Card className="border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Camera Role Designation
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Assign operational role to camera {selectedVideo.camera_id} to steer AI behavior.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Operational Role
                      </label>
                      <Select
                        value={role}
                        onChange={(e) =>
                          setRole(
                            e.target.value as "ENTRY" | "PARKING_LOT" | "EXIT" | "UNKNOWN"
                          )
                        }
                      >
                        <option value="ENTRY">ENTRY (Gate check-in & ANPR)</option>
                        <option value="PARKING_LOT">PARKING_LOT (Slot occupancy & sessions)</option>
                        <option value="EXIT">EXIT (Exit check-out & slot release)</option>
                        <option value="UNKNOWN">UNKNOWN</option>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {role === "ENTRY" &&
                          "Processes incoming vehicles, recognizes license plates, and registers facility check-in."}
                        {role === "PARKING_LOT" &&
                          "Monitors parking bays, computes polygon IoU, and manages parking sessions."}
                        {role === "EXIT" &&
                          "Recognizes exiting vehicles, calculates stay duration, and marks sessions closed."}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Covered Area / Level
                      </label>
                      <Input
                        value={parkingArea}
                        onChange={(e) => setParkingArea(e.target.value)}
                        placeholder="e.g. Level B2, Zone A"
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Assigned Slot Group
                      </label>
                      <Input
                        value={slotGroup}
                        onChange={(e) => setSlotGroup(e.target.value)}
                        placeholder="e.g. P01-P05"
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <Button
                        size="sm"
                        onClick={handleSaveDesignation}
                        disabled={savingDesignation}
                        className="text-xs"
                      >
                        {savingDesignation ? (
                          <LoadingSpinner className="h-3.5 w-3.5 mr-1" />
                        ) : null}
                        Save Designation
                      </Button>

                      {saveSuccess && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Saved & Dispatched
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Panel 2: Video File Metadata */}
                <Card className="border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-primary" />
                      Recording Specifications
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Extracted OpenCV container and codec metrics.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Filename</span>
                      <span className="font-mono font-medium text-foreground truncate max-w-[180px]">
                        {selectedVideo.filename}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Camera ID</span>
                      <span className="font-mono font-medium text-foreground">
                        {selectedVideo.camera_id}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatDurationSec(selectedVideo.duration_seconds)} ({selectedVideo.duration_seconds}s)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Resolution</span>
                      <span className="font-mono font-medium text-foreground">
                        {selectedVideo.resolution || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Frame Rate</span>
                      <span className="font-mono font-medium text-foreground">
                        {selectedVideo.fps ? `${selectedVideo.fps.toFixed(1)} FPS` : "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">File Size</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatBytes(selectedVideo.file_size_bytes)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Last Processed</span>
                      <span className="font-mono font-medium text-foreground">
                        {selectedVideo.processed_at ? new Date(selectedVideo.processed_at).toLocaleTimeString() : "Never"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <Film className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a CCTV recording from the left panel to begin.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
