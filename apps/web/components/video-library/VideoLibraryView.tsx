"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Film,
  Video,
  Search,
  MapPin,
  FileVideo,
  HardDrive,
  Sliders,
  AlertCircle,
  Layers,
  Cctv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { CANONICAL_16_CAMERAS, type DemoCamera } from "@/components/digital-twin/demoScenarioData";
import { ROUTES } from "@/utils/routes";

export interface ProjectVideoItem {
  id: string;
  filename: string;
  url: string;
  cameraId: string;
  durationSeconds: number;
  durationLabel: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  resolution: string;
  format: string;
  fps: number;
  description: string;
  coverageArea: string;
}

// ─── CANONICAL PROJECT VIDEO RECORDINGS ───────────────────────────────────────
export const PROJECT_VIDEOS_MAP: Record<string, ProjectVideoItem[]> = {
  "CAM-01": [
    {
      id: "cam1_entry_gate",
      filename: "cam1_entry_gate.mp4",
      url: "/videos/cam1_entry_gate.mp4",
      cameraId: "CAM-01",
      durationSeconds: 12,
      durationLabel: "00:12",
      fileSizeBytes: 2264309,
      fileSizeLabel: "2.16 MB",
      resolution: "1920 × 1080 (1080p)",
      format: "MP4 (H.264 / AAC)",
      fps: 30.0,
      description:
        "Access Point B2 entry gate corridor capturing incoming vehicle arrivals, license plates, and gate barrier actuation.",
      coverageArea: "Access Point B2 Entrance Ramp",
    },
  ],
  "CAM-02": [
    {
      id: "cam2_parking_bay",
      filename: "cam2_parking_bay.mp4",
      url: "/videos/cam2_parking_bay.mp4",
      cameraId: "CAM-02",
      durationSeconds: 12,
      durationLabel: "00:12",
      fileSizeBytes: 2216801,
      fileSizeLabel: "2.11 MB",
      resolution: "1920 × 1080 (1080p)",
      format: "MP4 (H.264 / AAC)",
      fps: 30.0,
      description:
        "High-angle perspective of the East main drive aisle, monitoring bay transit, lane navigation, and parking maneuvers.",
      coverageArea: "East Drive Corridor & Zone B/C Bays",
    },
  ],
  "CAM-03": [
    {
      id: "cam3_exit_ramp",
      filename: "cam3_exit_ramp.mp4",
      url: "/videos/cam3_exit_ramp.mp4",
      cameraId: "CAM-03",
      durationSeconds: 10,
      durationLabel: "00:10",
      fileSizeBytes: 1660795,
      fileSizeLabel: "1.58 MB",
      resolution: "1920 × 1080 (1080p)",
      format: "MP4 (H.264 / AAC)",
      fps: 30.0,
      description:
        "South perimeter driveway corridor camera tracking aisle navigation toward lower parking zones (never exit gate).",
      coverageArea: "South Perimeter Driveway & Zone E Bays",
    },
  ],
};

export function VideoLibraryView() {
  const [selectedCameraId, setSelectedCameraId] = useState<string>("CAM-01");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("cam1_entry_gate");
  const [filterType, setFilterType] = useState<"ALL" | "WITH_VIDEO" | "STANDBY">("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selected camera from canonical list
  const selectedCamera = useMemo(() => {
    return CANONICAL_16_CAMERAS.find((c) => c.id === selectedCameraId) ?? CANONICAL_16_CAMERAS[0]!;
  }, [selectedCameraId]);

  // Videos associated with selected camera
  const selectedCameraVideos = useMemo(() => {
    return PROJECT_VIDEOS_MAP[selectedCamera.id] || [];
  }, [selectedCamera.id]);

  // Selected video object
  const activeVideo = useMemo(() => {
    return (
      selectedCameraVideos.find((v) => v.id === selectedVideoId) ??
      selectedCameraVideos[0] ??
      null
    );
  }, [selectedCameraVideos, selectedVideoId]);

  // Filtered cameras for left directory pane
  const filteredCameras = useMemo(() => {
    return CANONICAL_16_CAMERAS.filter((cam) => {
      const hasVideo = !!PROJECT_VIDEOS_MAP[cam.id]?.length;

      // Filter by tab
      if (filterType === "WITH_VIDEO" && !hasVideo) return false;
      if (filterType === "STANDBY" && hasVideo) return false;

      // Filter by role
      if (roleFilter !== "ALL" && cam.role !== roleFilter) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vids = PROJECT_VIDEOS_MAP[cam.id] || [];
        const matchesCam =
          cam.id.toLowerCase().includes(q) ||
          cam.label.toLowerCase().includes(q) ||
          cam.locationName.toLowerCase().includes(q) ||
          cam.role.toLowerCase().includes(q);
        const matchesVid = vids.some((v) => v.filename.toLowerCase().includes(q));
        if (!matchesCam && !matchesVid) return false;
      }

      return true;
    });
  }, [filterType, roleFilter, searchQuery]);

  const configuredVideoCount = Object.keys(PROJECT_VIDEOS_MAP).length; // 3
  const standbyCameraCount = CANONICAL_16_CAMERAS.length - configuredVideoCount; // 13

  const handleSelectCamera = (cam: DemoCamera) => {
    setSelectedCameraId(cam.id);
    const vids = PROJECT_VIDEOS_MAP[cam.id] || [];
    if (vids.length > 0 && vids[0]) {
      setSelectedVideoId(vids[0].id);
    } else {
      setSelectedVideoId("");
    }
  };

  const roleColor = (r: string) => {
    switch (r) {
      case "ENTRY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "EXIT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        icon={Film}
        title="Video Directory"
        subtitle="Canonical facility video recordings organized by camera, physical location, and operational role"
        badge={<SourceBadge source="mp4" />}
        rightSlot={
          <div className="flex items-center gap-2">
            <Link href={ROUTES.videoProcessing}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
                <Cctv className="h-3.5 w-3.5" />
                <span>CCTV Matrix</span>
              </Button>
            </Link>
            <Link href={ROUTES.digitalTwin}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
                <Layers className="h-3.5 w-3.5" />
                <span>Digital Twin</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Facility Camera Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              FACILITY CAMERAS
            </p>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              {CANONICAL_16_CAMERAS.length} Channels
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">16-camera surveillance grid</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              CONFIGURED FOOTAGE
            </p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {configuredVideoCount} Videos
            </p>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">CAM-01, CAM-02, CAM-03</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-muted/20 backdrop-blur-sm shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              STANDBY CAMERAS
            </p>
            <p className="text-xl font-bold font-mono text-muted-foreground mt-0.5">
              {standbyCameraCount} Channels
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">No video source assigned</p>
          </CardContent>
        </Card>

        <Card className="border-sky-500/30 bg-sky-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
              STORAGE FOOTPRINT
            </p>
            <p className="text-xl font-bold font-mono text-sky-400 mt-0.5">5.85 MB Total</p>
            <p className="text-[10px] text-sky-400/80 mt-0.5">1080p H.264 / AAC High-Def</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-xl border border-border/80">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterType === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            All Cameras (16)
          </button>
          <button
            onClick={() => setFilterType("WITH_VIDEO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterType === "WITH_VIDEO"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            With Video (3)
          </button>
          <button
            onClick={() => setFilterType("STANDBY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              filterType === "STANDBY"
                ? "bg-slate-700 text-slate-100 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Standby (13)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Roles</option>
            <option value="ENTRY">ENTRY</option>
            <option value="PATH/PARKING">PATH/PARKING</option>
            <option value="EXIT">EXIT</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search camera or file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Directory Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Tree Navigation (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Surveillance Cameras ({filteredCameras.length})
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Click to inspect footage
            </span>
          </div>

          <div className="space-y-2 max-h-[780px] overflow-y-auto pr-1">
            {filteredCameras.map((cam) => {
              const vids = PROJECT_VIDEOS_MAP[cam.id] || [];
              const hasVideo = vids.length > 0;
              const isSelected = selectedCamera.id === cam.id;
              const isExit = cam.role === "EXIT";

              return (
                <div
                  key={cam.id}
                  onClick={() => handleSelectCamera(cam)}
                  className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : hasVideo
                      ? "border-border/80 bg-card hover:border-primary/50 hover:bg-card/80"
                      : "border-border/40 bg-muted/10 opacity-75 hover:opacity-100 hover:border-border/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {cam.id}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${roleColor(
                            cam.role
                          )}`}
                        >
                          {cam.role}
                        </span>
                        {hasVideo ? (
                          <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span>⏺</span>
                            <span>RECORDED</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border/50">
                            {isExit ? "RESERVED EXIT" : "STANDBY"}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-foreground truncate">{cam.label}</p>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                        <MapPin className="h-3 w-3 text-sky-400 shrink-0" />
                        <span className="truncate">
                          ({cam.x}, {cam.y}) · {cam.locationName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* If camera has videos, render file rows */}
                  {hasVideo && (
                    <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                      {vids.map((vid) => {
                        const isVidActive = isSelected && selectedVideoId === vid.id;
                        return (
                          <div
                            key={vid.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCameraId(cam.id);
                              setSelectedVideoId(vid.id);
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all ${
                              isVidActive
                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                : "bg-muted/30 text-foreground hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileVideo className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{vid.filename}</span>
                            </div>
                            <div
                              className={`text-[10px] shrink-0 ${
                                isVidActive ? "text-primary-foreground/90" : "text-muted-foreground"
                              }`}
                            >
                              {vid.durationLabel} · {vid.fileSizeLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!hasVideo && (
                    <div className="mt-2 pt-2 border-t border-border/20 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>Physical channel provisioned</span>
                      <span className="text-amber-400/90 font-medium">NO VIDEO SOURCE</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Video Preview, Player & Technical Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {activeVideo ? (
            <>
              {/* ── Video Player Card ── */}
              <Card className="border border-border/80 bg-card overflow-hidden shadow-sm">
                <div className="relative bg-black aspect-video flex items-center justify-center">
                  <video
                    key={activeVideo.id}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                    src={activeVideo.url}
                  >
                    Your browser does not support HTML5 video playback.
                  </video>

                  {/* Top Bar Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-black/85 text-white border border-white/20">
                      {activeVideo.cameraId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-xs font-bold border uppercase ${roleColor(
                        selectedCamera.role
                      )}`}
                    >
                      {selectedCamera.role}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                      ⏺ RECORDED / DEMO · REPLAY
                    </span>
                  </div>

                  {/* Bottom Right Location Tag */}
                  <div className="absolute bottom-3 right-3 pointer-events-none hidden sm:block">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-black/75 text-muted-foreground border border-white/10">
                      {selectedCamera.locationName}
                    </span>
                  </div>
                </div>

                {/* Quick Navigation Action Strip */}
                <CardContent className="p-3.5 bg-card/80 flex flex-wrap items-center justify-between gap-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {activeVideo.filename}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {activeVideo.resolution}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={ROUTES.videoProcessing}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
                        <Cctv className="h-3.5 w-3.5" />
                        <span>View in CCTV</span>
                      </Button>
                    </Link>

                    <Link href={ROUTES.digitalTwin}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
                        <Layers className="h-3.5 w-3.5" />
                        <span>Locate in Twin</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* ── Two-Column Specifications & Operational Assignment ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Panel 1: Recording Specifications */}
                <Card className="border border-border/80 bg-card/60">
                  <CardHeader className="pb-2.5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-primary" />
                      Recording Specifications
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Media container metrics and spatial linkage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-sans">Filename</span>
                      <span className="font-bold text-foreground truncate max-w-[200px]">
                        {activeVideo.filename}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-sans">Camera ID</span>
                      <span className="font-bold text-primary">{activeVideo.cameraId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-sans">Playback Mode</span>
                      <span className="text-emerald-400 font-bold">RECORDED / REPLAY</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-sans">Duration</span>
                      <span className="text-foreground">
                        {activeVideo.durationLabel} ({activeVideo.durationSeconds}s)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-sans">Resolution</span>
                      <span className="text-foreground">{activeVideo.resolution}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-sans">Format &amp; Codec</span>
                      <span className="text-foreground">{activeVideo.format}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-sans">Frame Rate</span>
                      <span className="text-foreground">{activeVideo.fps.toFixed(1)} FPS</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground font-sans">File Size</span>
                      <span className="text-foreground">{activeVideo.fileSizeLabel}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Panel 2: Operational Role & Facility Assignment */}
                <Card className="border border-border/80 bg-card/60">
                  <CardHeader className="pb-2.5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Camera Operational Context
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Functional purpose in the Smart Parking OS.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono uppercase text-muted-foreground">
                        Designated Role
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${roleColor(
                            selectedCamera.role
                          )}`}
                        >
                          {selectedCamera.role}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {selectedCamera.role === "ENTRY"
                            ? "Gate check-in & ANPR plate recognition"
                            : selectedCamera.role === "EXIT"
                            ? "Facility check-out & slot release"
                            : "Aisle monitoring & slot occupancy"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono uppercase text-muted-foreground">
                        Physical Coverage Area
                      </span>
                      <p className="font-semibold text-foreground">{activeVideo.coverageArea}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono uppercase text-muted-foreground">
                        Floor Plan Coordinates
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-sky-400" />
                        <span>
                          ({selectedCamera.x}, {selectedCamera.y}) on 1472×1508 Canvas
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/30">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {activeVideo.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            /* ── Standby Camera State Card (Cameras Without Video) ── */
            <Card className="border border-border/80 bg-card/60 p-8 shadow-sm">
              <div className="flex flex-col items-center text-center space-y-4 max-w-lg mx-auto py-6">
                <div className="h-16 w-16 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground">
                  <Video className="h-8 w-8 opacity-60" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-base font-bold text-foreground">
                      {selectedCamera.id}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase ${roleColor(
                        selectedCamera.role
                      )}`}
                    >
                      {selectedCamera.role}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{selectedCamera.label}</h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    ({selectedCamera.x}, {selectedCamera.y}) · {selectedCamera.locationName}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>NO VIDEO SOURCE</strong> — This physical hardware channel is provisioned
                    in the 16-camera facility topology, but has no recorded demo MP4 file assigned.
                    It operates in standby mode.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Link href={ROUTES.digitalTwin}>
                    <Button variant="default" size="sm" className="gap-1.5 text-xs font-mono">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Locate on Digital Twin</span>
                    </Button>
                  </Link>

                  <Link href={ROUTES.videoProcessing}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
                      <Cctv className="h-3.5 w-3.5" />
                      <span>View in CCTV Matrix</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
