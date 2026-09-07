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
  Folder,
  FolderOpen,
  Copy,
  Check,
  Clock,
  Database,
  Play,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { CANONICAL_16_CAMERAS } from "@/components/digital-twin/demoScenarioData";
import { ROUTES } from "@/utils/routes";
import {
  REAL_ARCHIVE_SEGMENTS,
  getPhysicalCameraGroups,
} from "./realArchiveRegistry";

// ─── CANONICAL PROJECT VIDEO TYPES & COMPATIBILITY EXPORT ────────────────────
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
  // ── Mode Switcher: "REAL_ARCHIVE" (Default) vs. "DEMO_REPLAY" ──
  const [activeTab, setActiveTab] = useState<"REAL_ARCHIVE" | "DEMO_REPLAY">("REAL_ARCHIVE");

  // ── Real Archive State ──
  const physicalGroups = useMemo(() => getPhysicalCameraGroups(), []);
  const [selectedPhysicalCamNum, setSelectedPhysicalCamNum] = useState<number>(16);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("seg_10a_cam16");
  const [archiveSearch, setArchiveSearch] = useState<string>("");
  const [archiveFilter, setArchiveFilter] = useState<"ALL" | "MULTI" | "SINGLE">("ALL");
  const [copiedType, setCopiedType] = useState<"file" | "folder" | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState<boolean>(false);

  // ── Demo Replay State ──
  const [selectedDemoCamId, setSelectedDemoCamId] = useState<string>("CAM-01");
  const [selectedDemoVideoId, setSelectedDemoVideoId] = useState<string>("cam1_entry_gate");
  const [demoRoleFilter, setDemoRoleFilter] = useState<string>("ALL");
  const [demoSearchQuery, setDemoSearchQuery] = useState<string>("");

  // ── Dynamic Metrics for Real Archive (Calculated from REAL_ARCHIVE_SEGMENTS) ──
  const archiveMetrics = useMemo(() => {
    const totalFiles = REAL_ARCHIVE_SEGMENTS.length;
    const totalCameras = physicalGroups.length;
    const totalBytes = REAL_ARCHIVE_SEGMENTS.reduce((sum, s) => sum + s.fileSizeBytes, 0);
    const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(0);
    return {
      totalCameras,
      totalFiles,
      totalBytes,
      totalStorageLabel: `${totalGb} GB (${totalMb} MB)`,
      timeCoverage: "15:44:59 → 17:00:00",
      facility: "Carparking-01",
      date: "27-Aug-2026",
    };
  }, [physicalGroups]);

  // ── Active Physical Camera Group & Active Segment ──
  const activePhysicalGroup = useMemo(() => {
    return (
      physicalGroups.find((g) => g.physicalCameraNum === selectedPhysicalCamNum) ??
      physicalGroups[0]!
    );
  }, [physicalGroups, selectedPhysicalCamNum]);

  const activeSegment = useMemo(() => {
    return (
      activePhysicalGroup.segments.find((s) => s.id === selectedSegmentId) ??
      activePhysicalGroup.segments[0] ??
      REAL_ARCHIVE_SEGMENTS[0]!
    );
  }, [activePhysicalGroup, selectedSegmentId]);

  // ── Filtered Physical Camera Groups ──
  const filteredPhysicalGroups = useMemo(() => {
    return physicalGroups.filter((group) => {
      // Filter by segment count
      if (archiveFilter === "MULTI" && group.segments.length <= 1) return false;
      if (archiveFilter === "SINGLE" && group.segments.length > 1) return false;

      // Filter by search query
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase();
        const matchesCam =
          group.physicalCameraId.toLowerCase().includes(q) ||
          group.physicalCameraNum.toString().includes(q) ||
          group.facility.toLowerCase().includes(q);
        const matchesSeg = group.segments.some(
          (s) =>
            s.filename.toLowerCase().includes(q) ||
            s.segmentCode.toLowerCase().includes(q) ||
            s.startTime.includes(q) ||
            s.endTime.includes(q)
        );
        if (!matchesCam && !matchesSeg) return false;
      }
      return true;
    });
  }, [physicalGroups, archiveFilter, archiveSearch]);

  // ── Clipboard Copy Helpers ──
  const handleCopyPath = (text: string, type: "file" | "folder") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  // ── Demo Replay Selection ──
  const selectedDemoCamera = useMemo(() => {
    return (
      CANONICAL_16_CAMERAS.find((c) => c.id === selectedDemoCamId) ??
      CANONICAL_16_CAMERAS[0]!
    );
  }, [selectedDemoCamId]);

  const selectedDemoVideos = useMemo(() => {
    return PROJECT_VIDEOS_MAP[selectedDemoCamera.id] || [];
  }, [selectedDemoCamera.id]);

  const activeDemoVideo = useMemo(() => {
    return (
      selectedDemoVideos.find((v) => v.id === selectedDemoVideoId) ??
      selectedDemoVideos[0] ??
      null
    );
  }, [selectedDemoVideos, selectedDemoVideoId]);

  const filteredDemoCameras = useMemo(() => {
    return CANONICAL_16_CAMERAS.filter((cam) => {
      if (demoRoleFilter !== "ALL" && cam.role !== demoRoleFilter) return false;
      if (demoSearchQuery.trim()) {
        const q = demoSearchQuery.toLowerCase();
        const vids = PROJECT_VIDEOS_MAP[cam.id] || [];
        const matchesCam =
          cam.id.toLowerCase().includes(q) ||
          cam.label.toLowerCase().includes(q) ||
          cam.locationName.toLowerCase().includes(q);
        const matchesVid = vids.some((v) => v.filename.toLowerCase().includes(q));
        if (!matchesCam && !matchesVid) return false;
      }
      return true;
    });
  }, [demoRoleFilter, demoSearchQuery]);

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
        title="Project Video Directory"
        subtitle="Authoritative repository of real CCTV recordings, physical camera sources, and deterministic replay assets"
        badge={
          activeTab === "REAL_ARCHIVE" ? (
            <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              ● RECORDED ARCHIVE (27-AUG-2026)
            </Badge>
          ) : (
            <SourceBadge source="mp4" />
          )
        }
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

      {/* ── Top Primary Tab Navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("REAL_ARCHIVE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === "REAL_ARCHIVE"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/60"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>REAL PROJECT ARCHIVE (27-AUG-2026)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              33 FILES
            </span>
          </button>

          <button
            onClick={() => setActiveTab("DEMO_REPLAY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              activeTab === "DEMO_REPLAY"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/60"
            }`}
          >
            <Film className="h-4 w-4" />
            <span>DEMO REPLAY ASSETS (DETERMINISTIC)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary border border-primary/30">
              3 VIDEOS
            </span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-muted-foreground hidden sm:flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-primary" />
          <span>Click any recording to inspect exact file &amp; folder locations</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VIEW A: REAL PROJECT ARCHIVE (27-AUG-2026)                           */}
      {/* ==================================================================== */}
      {activeTab === "REAL_ARCHIVE" && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* ── Dynamic Archive Metrics Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5">
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  PHYSICAL CAMERAS
                </p>
                <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                  {archiveMetrics.totalCameras} Channels
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  IP Cameras 3, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 19, 20, 21, 22, 24
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5">
                <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  RECORDED VIDEO FILES
                </p>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {archiveMetrics.totalFiles} Segments
                </p>
                <p className="text-[10px] text-emerald-400/80 mt-0.5">
                  Complete 27-Aug-2026 Archive
                </p>
              </CardContent>
            </Card>

            <Card className="border-sky-500/30 bg-sky-500/5 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5">
                <p className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
                  TOTAL ARCHIVE STORAGE
                </p>
                <p className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                  {archiveMetrics.totalStorageLabel}
                </p>
                <p className="text-[10px] text-sky-400/80 mt-0.5">
                  14,961,061,816 bytes verified
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm shadow-sm">
              <CardContent className="p-3.5">
                <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                  RECORDING COVERAGE
                </p>
                <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {archiveMetrics.timeCoverage}
                </p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">
                  Carparking-01 · 75m Session
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Filter & Search Toolbar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-xl border border-border/80">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setArchiveFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  archiveFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                All Cameras ({physicalGroups.length})
              </button>
              <button
                onClick={() => setArchiveFilter("MULTI")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  archiveFilter === "MULTI"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Multi-Segment (9)
              </button>
              <button
                onClick={() => setArchiveFilter("SINGLE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  archiveFilter === "SINGLE"
                    ? "bg-slate-700 text-slate-100 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Single-Segment (7)
              </button>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search camera, segment, or filename..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="h-8 pl-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* ── Two-Column Workspace: Left Directory Pane (5 cols), Right Folder & File Inspector (7 cols) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Pane: Physical Cameras & Segments Tree */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Physical IP Cameras ({filteredPhysicalGroups.length})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Click to open folder &amp; inspect file
                </span>
              </div>

              <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
                {filteredPhysicalGroups.map((group) => {
                  const isSelected = selectedPhysicalCamNum === group.physicalCameraNum;
                  return (
                    <div
                      key={group.physicalCameraNum}
                      onClick={() => {
                        setSelectedPhysicalCamNum(group.physicalCameraNum);
                        if (group.segments[0]) {
                          setSelectedSegmentId(group.segments[0].id);
                        }
                      }}
                      className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                          : "border-border/80 bg-card hover:border-primary/50 hover:bg-card/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {group.physicalCameraId}
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              MAPPING: UNVERIFIED
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {group.segments.length} {group.segments.length > 1 ? "SEGMENTS" : "SEGMENT"}
                            </span>
                          </div>

                          <p className="text-xs font-mono text-muted-foreground">
                            Coverage: {group.timeCoverage} · {group.totalSizeLabel}
                          </p>
                        </div>

                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isSelected ? "rotate-90 text-primary" : "group-hover:translate-x-0.5"
                          }`}
                        />
                      </div>

                      {/* Segments list inside camera card */}
                      <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                        {group.segments.map((seg) => {
                          const isSegActive = isSelected && selectedSegmentId === seg.id;
                          return (
                            <div
                              key={seg.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhysicalCamNum(group.physicalCameraNum);
                                setSelectedSegmentId(seg.id);
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all ${
                                isSegActive
                                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                  : "bg-muted/30 text-foreground hover:bg-muted/60"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileVideo className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-bold px-1 py-0.2 rounded bg-black/30 text-[10px]">
                                  {seg.segmentCode}
                                </span>
                                <span className="truncate">{seg.startTime} → {seg.endTime}</span>
                              </div>
                              <div
                                className={`text-[10px] shrink-0 ${
                                  isSegActive ? "text-primary-foreground/90" : "text-muted-foreground"
                                }`}
                              >
                                {seg.durationLabel} · {seg.fileSizeLabel}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Industrial Folder & File Location Inspector */}
            <div className="lg:col-span-7 space-y-5">
              <Card className="border border-border/80 bg-card shadow-sm overflow-hidden">
                {/* Inspector Header */}
                <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <span>Archive Folder &amp; File Location Inspector</span>
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Direct filesystem location in real CCTV archive · One-click path copy
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        PARKTWIN MAPPING: UNVERIFIED
                      </span>
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ● RECORDED ARCHIVE
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* ── Monospace Folder Location Box ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5 text-amber-400" />
                        <span>Archive Folder Directory (Windows Filesystem)</span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPath(activeSegment.folderWindowsPath, "folder")}
                        className="h-7 text-xs font-mono gap-1.5"
                      >
                        {copiedType === "folder" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied Folder Path!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Folder Path</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="p-3 rounded-lg bg-black/60 border border-border/80 font-mono text-xs text-amber-300 break-all select-all flex items-center justify-between gap-3">
                      <span>{activeSegment.folderWindowsPath}</span>
                    </div>
                  </div>

                  {/* ── Monospace Exact File Path Box ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileVideo className="h-3.5 w-3.5 text-primary" />
                        <span>Exact Recording File Path</span>
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCopyPath(activeSegment.fullWindowsPath, "file")}
                        className="h-7 text-xs font-mono gap-1.5 shadow-sm"
                      >
                        {copiedType === "file" ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span className="font-bold">Copied File Path!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Full File Path</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="p-3 rounded-lg bg-black/60 border border-primary/40 font-mono text-xs text-foreground break-all select-all flex items-center justify-between gap-3">
                      <span>{activeSegment.fullWindowsPath}</span>
                    </div>
                  </div>

                  {/* ── Interactive Visual Folder Tree / Breadcrumbs ── */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                      Visual Folder Hierarchy Tree
                    </span>

                    <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs font-mono space-y-1.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Folder className="h-3.5 w-3.5 text-amber-400" />
                        <span>Desktop</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>parktwin</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>27-Aug-2026</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>27-Aug_3-55 to 5-05 pm</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-amber-300 font-semibold">20260827154500-20260827170000</span>
                      </div>

                      <div className="flex items-center gap-2 pl-4 pt-1 border-l-2 border-primary/50 text-foreground font-semibold">
                        <FileVideo className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{activeSegment.filename}</span>
                        <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                          {activeSegment.segmentCode} · {activeSegment.fileSizeLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* ── Sibling Segments Quick Switcher ── */}
                  {activePhysicalGroup.segments.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                          Physical Camera {activePhysicalGroup.physicalCameraNum} Segments ({activePhysicalGroup.segments.length})
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Click to inspect segment
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {activePhysicalGroup.segments.map((seg) => {
                          const isActive = seg.id === activeSegment.id;
                          return (
                            <button
                              key={seg.id}
                              onClick={() => setSelectedSegmentId(seg.id)}
                              className={`p-2 rounded-lg border text-left font-mono text-xs transition-all ${
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                                  : "bg-muted/20 text-foreground border-border/60 hover:border-primary/40 hover:bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>Segment {seg.segmentCode}</span>
                                <span className="text-[10px] opacity-80">{seg.durationLabel}</span>
                              </div>
                              <div className="text-[10px] opacity-75 mt-0.5 truncate">
                                {seg.fileSizeLabel}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Metadata & Provenance Grid ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-card/60 border border-border/60 space-y-2">
                      <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-sky-400" />
                        <span>Recording Window &amp; Container</span>
                      </span>
                      <div className="flex justify-between py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">Start Time:</span>
                        <span className="text-foreground font-semibold">{activeSegment.startFull}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">End Time:</span>
                        <span className="text-foreground font-semibold">{activeSegment.endFull}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="text-foreground">{activeSegment.durationLabel} ({activeSegment.durationSeconds}s)</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">Format / Codec:</span>
                        <span className="text-foreground">{activeSegment.format}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-card/60 border border-border/60 space-y-2">
                      <span className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-primary" />
                        <span>Data Provenance &amp; Storage</span>
                      </span>
                      <div className="flex justify-between py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">Source Type:</span>
                        <span className="text-emerald-400 font-semibold">{activeSegment.sourceType}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">Facility / Zone:</span>
                        <span className="text-foreground">{activeSegment.facility}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">File Size:</span>
                        <span className="text-foreground">{activeSegment.fileSizeLabel}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">ParkTwin Mapping:</span>
                        <span className="text-amber-400 font-bold">{activeSegment.mappingStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Optional Video Stream Preview Drawer (Off by default as user requested) ── */}
                  <div className="pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-sky-400" />
                        <span>Video Stream Playback (Disabled by default to avoid heavy decoding)</span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVideoPreview(!showVideoPreview)}
                        className="h-7 text-xs font-mono gap-1.5"
                      >
                        {showVideoPreview ? (
                          <span>Hide Video Stream</span>
                        ) : (
                          <>
                            <Play className="h-3 w-3 fill-current text-primary" />
                            <span>Preview Video Stream</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {showVideoPreview && (
                      <div className="relative bg-black rounded-xl overflow-hidden border border-border/80 aspect-video mt-3 animate-in fade-in-50">
                        <video
                          key={activeSegment.id}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                          src={activeSegment.videoUrl}
                        >
                          Your browser does not support HTML5 video streaming.
                        </video>
                      </div>
                    )}
                  </div>

                  {/* ── Interactive Folder Directory Contents Browser ── */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5 text-amber-400" />
                        <span>Directory Contents ({REAL_ARCHIVE_SEGMENTS.length} Files in Archive Folder)</span>
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Click any file row to inspect
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-black/40 text-xs font-mono divide-y divide-border/30">
                      {REAL_ARCHIVE_SEGMENTS.map((file, idx) => {
                        const isFileActive = file.id === activeSegment.id;
                        return (
                          <div
                            key={file.id}
                            onClick={() => {
                              setSelectedPhysicalCamNum(file.physicalCameraNum);
                              setSelectedSegmentId(file.id);
                            }}
                            className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${
                              isFileActive
                                ? "bg-primary/20 text-foreground font-bold border-l-4 border-primary pl-3"
                                : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[10px] text-muted-foreground/60 w-5 text-right font-mono">
                                {idx + 1}
                              </span>
                              <FileVideo className={`h-3.5 w-3.5 shrink-0 ${isFileActive ? "text-primary" : ""}`} />
                              <span className="truncate">{file.filename}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-[10px]">
                              <span className="px-1 py-0.5 rounded bg-muted/40 text-muted-foreground">
                                {file.physicalCameraId}
                              </span>
                              <span className="text-muted-foreground">{file.fileSizeLabel}</span>
                              {isFileActive && (
                                <Badge variant="default" className="text-[9px] px-1 py-0 bg-emerald-600">
                                  ACTIVE
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW B: DEMO REPLAY ASSETS (PARKTWIN DETERMINISTIC)                  */}
      {/* ==================================================================== */}
      {activeTab === "DEMO_REPLAY" && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* Facility Camera Metrics Strip */}
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
                  DEMO FOOTAGE
                </p>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  3 Videos
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
                  13 Channels
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Provisioned topology</p>
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

          {/* Filter & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-xl border border-border/80">
            <div className="flex items-center gap-2">
              <select
                value={demoRoleFilter}
                onChange={(e) => setDemoRoleFilter(e.target.value)}
                className="h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Roles</option>
                <option value="ENTRY">ENTRY</option>
                <option value="PATH/PARKING">PATH/PARKING</option>
                <option value="EXIT">EXIT</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search camera or file..."
                value={demoSearchQuery}
                onChange={(e) => setDemoSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Two-Column Directory Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Camera Tree Navigation (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  ParkTwin Canonical Cameras ({filteredDemoCameras.length})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Click to inspect footage
                </span>
              </div>

              <div className="space-y-2 max-h-[780px] overflow-y-auto pr-1">
                {filteredDemoCameras.map((cam) => {
                  const vids = PROJECT_VIDEOS_MAP[cam.id] || [];
                  const hasVideo = vids.length > 0;
                  const isSelected = selectedDemoCamera.id === cam.id;
                  const isExit = cam.role === "EXIT";

                  return (
                    <div
                      key={cam.id}
                      onClick={() => {
                        setSelectedDemoCamId(cam.id);
                        if (vids.length > 0 && vids[0]) {
                          setSelectedDemoVideoId(vids[0].id);
                        } else {
                          setSelectedDemoVideoId("");
                        }
                      }}
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
                                <span>DEMO REPLAY</span>
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

                      {hasVideo && (
                        <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
                          {vids.map((vid) => {
                            const isVidActive = isSelected && selectedDemoVideoId === vid.id;
                            return (
                              <div
                                key={vid.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDemoCamId(cam.id);
                                  setSelectedDemoVideoId(vid.id);
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
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Demo Video Player & Inspector (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {activeDemoVideo ? (
                <>
                  <Card className="border border-border/80 bg-card overflow-hidden shadow-sm">
                    <div className="relative bg-black aspect-video flex items-center justify-center">
                      <video
                        key={activeDemoVideo.id}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                        src={activeDemoVideo.url}
                      >
                        Your browser does not support HTML5 video playback.
                      </video>

                      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-black/85 text-white border border-white/20">
                          {activeDemoVideo.cameraId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-xs font-bold border uppercase ${roleColor(
                            selectedDemoCamera.role
                          )}`}
                        >
                          {selectedDemoCamera.role}
                        </span>
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                          ⏺ DEMO · REPLAY
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-3.5 bg-card/80 flex flex-wrap items-center justify-between gap-3 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-foreground">
                          {activeDemoVideo.filename}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {activeDemoVideo.resolution}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border border-border/80 bg-card/60">
                      <CardHeader className="pb-2.5">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-primary" />
                          Recording Specifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground font-sans">Filename</span>
                          <span className="font-bold text-foreground truncate max-w-[200px]">
                            {activeDemoVideo.filename}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground font-sans">Camera ID</span>
                          <span className="font-bold text-primary">{activeDemoVideo.cameraId}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground font-sans">Duration</span>
                          <span className="text-foreground">{activeDemoVideo.durationLabel}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground font-sans">File Size</span>
                          <span className="text-foreground">{activeDemoVideo.fileSizeLabel}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-border/80 bg-card/60">
                      <CardHeader className="pb-2.5">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-primary" />
                          Camera Operational Context
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono uppercase text-muted-foreground">
                            Designated Role
                          </span>
                          <p className="font-mono text-xs font-bold text-primary">
                            {selectedDemoCamera.role}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono uppercase text-muted-foreground">
                            Coverage Area
                          </span>
                          <p className="font-semibold text-foreground">{activeDemoVideo.coverageArea}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card className="border border-border/80 bg-card/60 p-8 shadow-sm">
                  <div className="flex flex-col items-center text-center space-y-4 max-w-lg mx-auto py-6">
                    <div className="h-16 w-16 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center text-muted-foreground">
                      <Video className="h-8 w-8 opacity-60" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-foreground">{selectedDemoCamera.id} · {selectedDemoCamera.label}</h3>
                      <p className="text-xs font-mono text-muted-foreground">
                        ({selectedDemoCamera.x}, {selectedDemoCamera.y}) · {selectedDemoCamera.locationName}
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
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
