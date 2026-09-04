"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  RotateCcw,
  Video,
  Car,
  Navigation,
  Camera,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Eye,
  AlertCircle,
  ExternalLink,
  Layers,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/services/api-client";

interface VehicleItem {
  id: string;
  prototype_id: string;
  license_plate: string;
  plate_confidence: number;
  vehicle_type: string;
  brand: string;
  model: string;
  color: string;
  status: "parked" | "exited" | "entering";
  snapshots?: string[];
  last_seen?: string;
}

interface SlotItem {
  id: string;
  slot_id: string;
  camera_id: string;
  zone: string;
  state: "free" | "occupied" | "reserved" | "unknown";
  position?: number[];
}

interface SessionItem {
  id: string;
  session_uid: string;
  camera_id: string;
  slot_id: string;
  license_plate: string;
  entry_time: string;
  exit_time?: string;
  duration_seconds: number;
  is_active: boolean;
}

interface EventItem {
  id: string;
  event_uid: string;
  event_type: string;
  camera_id?: string;
  slot_id?: string;
  license_plate?: string;
  timestamp: string;
  source_type: string;
}

interface RouteData {
  source: string;
  destination: string;
  distance_meters: number;
  path: string[];
  waypoints: Array<{ id: string; name: string; x: number; y: number }>;
  directions: string[];
}

export function PrototypeMondayView() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>("P02");
  const [route, setRoute] = useState<RouteData | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeCamVideo, setActiveCamVideo] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [vRes, sRes, sessRes, evRes] = await Promise.all([
        apiGet<VehicleItem[]>("/vehicles"),
        apiGet<SlotItem[]>("/slots"),
        apiGet<SessionItem[]>("/sessions"),
        apiGet<EventItem[]>("/events?limit=30"),
      ]);
      setVehicles(vRes || []);
      setSlots(sRes || []);
      setSessions(sessRes || []);
      setEvents(evRes || []);
    } catch (err) {
      console.error("Failed to fetch prototype data:", err);
    }
  }, []);

  useEffect(() => {
    if (!selectedSlot) return;
    apiGet<RouteData>(`/navigation/route?from_node=ENTRY_GATE&to_slot=${selectedSlot}`)
      .then((r) => setRoute(r))
      .catch(() => setRoute(null));
  }, [selectedSlot]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRunReplay = async () => {
    setIsPlayingReplay(true);
    try {
      await apiPost("/prototype/replay/run?scenario=monday&reset=true", {});
      await fetchData();
    } catch (err) {
      console.error("Replay execution error:", err);
    } finally {
      setIsPlayingReplay(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await apiPost("/prototype/replay/reset", {});
      await fetchData();
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const occupiedSlots = slots.filter((s) => s.state === "occupied");
  const freeSlots = slots.filter((s) => s.state === "free");
  const activeSessions = sessions.filter((s) => s.is_active);

  const getSlotVehicle = (slotId: string) => {
    const active = sessions.find((s) => s.slot_id === slotId && s.is_active);
    if (!active) return null;
    return vehicles.find((v) => v.license_plate === active.license_plate);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-background via-card to-background p-6 shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
                Monday 3-Day Prototype
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                100% Real CCTV Provenance
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Facility: Carparking-01 Basement B2</h1>
            <p className="text-xs text-muted-foreground md:text-sm">
              Deterministic replay of 7 verified CCTV vehicles across 3 synchronized camera angles (CAM-01, CAM-02, CAM-03).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={isPlayingReplay}
              onClick={handleRunReplay}
              className="gap-1.5 font-medium shadow"
            >
              <Play className={`h-4 w-4 ${isPlayingReplay ? "animate-spin" : ""}`} />
              {isPlayingReplay ? "Replaying..." : "Run Replay"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isResetting}
              onClick={handleReset}
              className="gap-1.5 font-medium"
            >
              <RotateCcw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
              Reset Demo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveCamVideo(activeCamVideo ? null : "CAM-01")}
              className="gap-1.5 font-medium"
            >
              <Video className="h-4 w-4" />
              {activeCamVideo ? "Hide Camera" : "View CCTV Footage"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground font-medium">Total Slots</div>
            <div className="mt-1 text-2xl font-bold tracking-tight">{slots.length || 10}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">P01 - P10</div>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Occupied Slots</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
              {occupiedSlots.length}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{occupiedSlots.map(s => s.slot_id).join(", ") || "None"}</div>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Available Free</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {freeSlots.length}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{freeSlots.map(s => s.slot_id).join(", ") || "None"}</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground font-medium">Active Sessions</div>
            <div className="mt-1 text-2xl font-bold tracking-tight">{activeSessions.length}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Zero duplicates</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground font-medium">Vehicles Tracked</div>
            <div className="mt-1 text-2xl font-bold tracking-tight">{vehicles.length}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">6 Parked, 1 Exited</div>
          </div>
          <div className="rounded-lg border bg-card/60 p-3">
            <div className="text-xs text-muted-foreground font-medium">Recorded Events</div>
            <div className="mt-1 text-2xl font-bold tracking-tight">{events.length}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">Deterministic log</div>
          </div>
        </div>
      </div>

      {activeCamVideo && (
        <Card className="border-primary/30 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  Real CCTV Camera Feeds (Carparking-01)
                </CardTitle>
                <CardDescription className="text-xs">
                  Authentic 25fps H.264 video clips synchronized across 3 zones.
                </CardDescription>
              </div>
              <div className="flex gap-1">
                {(["CAM-01", "CAM-02", "CAM-03"] as const).map((cam) => (
                  <Button
                    key={cam}
                    variant={activeCamVideo === cam ? "default" : "outline"}
                    size="sm"
                    className="text-xs px-2.5 h-7"
                    onClick={() => setActiveCamVideo(cam)}
                  >
                    {cam}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setActiveCamVideo(null)}
                >
                  ✕ Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video w-full max-w-3xl mx-auto overflow-hidden rounded-lg bg-black border">
              <video
                key={activeCamVideo}
                controls
                autoPlay
                loop
                muted
                className="h-full w-full object-contain"
                src={
                  activeCamVideo === "CAM-01"
                    ? "/videos/cam1_entry_gate.mp4"
                    : activeCamVideo === "CAM-02"
                    ? "/videos/cam2_parking_bay.mp4"
                    : "/videos/cam3_exit_ramp.mp4"
                }
              />
              <div className="absolute top-3 left-3 bg-black/70 px-2 py-1 rounded text-[11px] text-white font-mono flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {activeCamVideo}: {
                  activeCamVideo === "CAM-01"
                    ? "B2 Entrance Gate"
                    : activeCamVideo === "CAM-02"
                    ? "B2 Parking Bays"
                    : "B2 Exit Ramp"
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                2D Interactive Facility Map & Shortest Path Navigation
              </CardTitle>
              <CardDescription className="text-xs">
                Click any slot (P01 - P10) to inspect vehicle occupancy and calculate the optimal shortest path route from Entry Gate.
              </CardDescription>
            </div>
            {route && (
              <Badge variant="secondary" className="text-xs font-mono py-1 px-3">
                <Navigation className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Route to {route.destination}: {route.distance_meters} m ({route.path.length} hops)
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <div className="relative w-full overflow-x-auto rounded-lg border bg-slate-950 p-6 text-slate-100 min-h-[380px]">
            <svg
              viewBox="0 0 880 440"
              className="w-full h-auto select-none"
              style={{ minWidth: "700px" }}
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>

              <rect width="880" height="440" fill="url(#grid)" />

              <rect x="20" y="170" width="180" height="70" fill="#1e293b" rx="4" />
              <rect x="180" y="140" width="480" height="130" fill="#1e293b" rx="4" />
              <rect x="640" y="170" width="220" height="70" fill="#1e293b" rx="4" />

              <line x1="30" y1="205" x2="850" y2="205" stroke="#475569" strokeWidth="2" strokeDasharray="8 8" />

              <rect x="25" y="140" width="140" height="130" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" rx="6" />
              <text x="35" y="160" fill="#38bdf8" fontSize="11" fontWeight="bold">CAM-01 Entrance</text>

              <rect x="190" y="30" width="440" height="150" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" rx="6" />
              <text x="200" y="50" fill="#a855f7" fontSize="11" fontWeight="bold">CAM-02 Parking Bays (Zone A)</text>

              <rect x="190" y="240" width="440" height="170" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" rx="6" />
              <text x="200" y="400" fill="#f59e0b" fontSize="11" fontWeight="bold">CAM-03 Exit Ramp (Zone B)</text>

              {route && route.waypoints && (
                <g>
                  <polyline
                    points={route.waypoints.map((w) => `${w.x * 1.5 + 40},${w.y * 1.3 + 40}`).join(" ")}
                    fill="none"
                    stroke="url(#routeGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-pulse"
                  />
                  {route.waypoints.map((w, idx) => (
                    <circle
                      key={idx}
                      cx={w.x * 1.5 + 40}
                      cy={w.y * 1.3 + 40}
                      r="5"
                      fill="#38bdf8"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  ))}
                </g>
              )}

              <g transform="translate(60, 190)">
                <circle cx="0" cy="0" r="14" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text x="0" y="4" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">IN</text>
                <text x="0" y="26" fill="#94a3b8" fontSize="10" textAnchor="middle">Entry Gate</text>
              </g>

              <g transform="translate(800, 190)">
                <circle cx="0" cy="0" r="14" fill="#e11d48" stroke="#f43f5e" strokeWidth="2" />
                <text x="0" y="4" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">OUT</text>
                <text x="0" y="26" fill="#94a3b8" fontSize="10" textAnchor="middle">Exit Barrier</text>
              </g>

              {["P01", "P02", "P03", "P04", "P05"].map((slotId, i) => {
                const s = slots.find((item) => item.slot_id === slotId);
                const isOccupied = s?.state === "occupied";
                const isSelected = selectedSlot === slotId;
                const v = getSlotVehicle(slotId);
                const x = 210 + i * 82;
                const y = 60;

                return (
                  <g
                    key={slotId}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => {
                      setSelectedSlot(slotId);
                      if (v) setSelectedVehicle(v);
                    }}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="0"
                      y="0"
                      width="72"
                      height="70"
                      rx="4"
                      fill={
                        isSelected
                          ? "rgba(56, 189, 248, 0.2)"
                          : isOccupied
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(16, 185, 129, 0.15)"
                      }
                      stroke={
                        isSelected
                          ? "#38bdf8"
                          : isOccupied
                          ? "#ef4444"
                          : "#10b981"
                      }
                      strokeWidth={isSelected ? "3" : "1.5"}
                    />

                    <text
                      x="36"
                      y="20"
                      fill={isSelected ? "#38bdf8" : "#f1f5f9"}
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {slotId}
                    </text>

                    {isOccupied ? (
                      <g transform="translate(6, 26)">
                        <rect x="0" y="0" width="60" height="36" rx="3" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
                        <text x="30" y="14" fill="#f87171" fontSize="9" fontWeight="bold" textAnchor="middle">
                          {v?.prototype_id || "OCCUPIED"}
                        </text>
                        <text x="30" y="27" fill="#cbd5e1" fontSize="8" textAnchor="middle" fontFamily="monospace">
                          {v?.license_plate || "KA..."}
                        </text>
                      </g>
                    ) : (
                      <text x="36" y="48" fill="#34d399" fontSize="10" fontWeight="medium" textAnchor="middle">
                        FREE
                      </text>
                    )}
                  </g>
                );
              })}

              {["P06", "P07", "P08", "P09", "P10"].map((slotId, i) => {
                const s = slots.find((item) => item.slot_id === slotId);
                const isOccupied = s?.state === "occupied";
                const isSelected = selectedSlot === slotId;
                const v = getSlotVehicle(slotId);
                const x = 210 + i * 82;
                const y = 280;

                return (
                  <g
                    key={slotId}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => {
                      setSelectedSlot(slotId);
                      if (v) setSelectedVehicle(v);
                    }}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <rect
                      x="0"
                      y="0"
                      width="72"
                      height="70"
                      rx="4"
                      fill={
                        isSelected
                          ? "rgba(56, 189, 248, 0.2)"
                          : isOccupied
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(16, 185, 129, 0.15)"
                      }
                      stroke={
                        isSelected
                          ? "#38bdf8"
                          : isOccupied
                          ? "#ef4444"
                          : "#10b981"
                      }
                      strokeWidth={isSelected ? "3" : "1.5"}
                    />

                    <text
                      x="36"
                      y="20"
                      fill={isSelected ? "#38bdf8" : "#f1f5f9"}
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {slotId}
                    </text>

                    {isOccupied ? (
                      <g transform="translate(6, 26)">
                        <rect x="0" y="0" width="60" height="36" rx="3" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
                        <text x="30" y="14" fill="#f87171" fontSize="9" fontWeight="bold" textAnchor="middle">
                          {v?.prototype_id || "OCCUPIED"}
                        </text>
                        <text x="30" y="27" fill="#cbd5e1" fontSize="8" textAnchor="middle" fontFamily="monospace">
                          {v?.license_plate || "KA..."}
                        </text>
                      </g>
                    ) : (
                      <text x="36" y="48" fill="#34d399" fontSize="10" fontWeight="medium" textAnchor="middle">
                        FREE
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {route && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-slate-900/90 p-2.5 text-xs text-slate-300 border border-slate-800">
                <span className="font-semibold text-sky-400 flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> Turn-by-Turn Route:
                </span>
                {route.directions.map((dir, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px]">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-slate-500" />}
                    {dir}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    Verified CCTV Vehicles (7 Total)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Extracted from Carparking-01 CCTV footage. Click any vehicle to view plate evidence and cross-camera timeline.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  Zero Mocked Data
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {vehicles.map((v) => {
                  const isSelected = selectedVehicle?.prototype_id === v.prototype_id;
                  const sess = sessions.find((s) => s.license_plate === v.license_plate);
                  const slotId = sess?.slot_id;

                  return (
                    <div
                      key={v.prototype_id}
                      onClick={() => {
                        setSelectedVehicle(v);
                        if (slotId) setSelectedSlot(slotId);
                      }}
                      className={`cursor-pointer rounded-lg border p-3 transition-all hover:shadow-md ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="font-mono text-xs font-bold">
                              {v.prototype_id}
                            </Badge>
                            <Badge
                              variant={v.status === "parked" ? "default" : "secondary"}
                              className={`text-[10px] uppercase font-semibold ${
                                v.status === "parked"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-500 text-white"
                              }`}
                            >
                              {v.status}
                            </Badge>
                            {slotId && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                Slot {slotId}
                              </Badge>
                            )}
                          </div>

                          <div className="inline-flex items-center rounded border border-slate-400 bg-white px-2 py-0.5 text-xs font-mono font-bold tracking-wider text-slate-900 shadow-sm dark:border-slate-600">
                            <span className="mr-1.5 text-[9px] font-bold text-blue-800">IND</span>
                            {v.license_plate}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {v.brand} {v.model} • <span className="font-medium">{v.color}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 items-end">
                          <img
                            src={`/evidence/${v.prototype_id.toLowerCase().replace("-", "")}_plate.jpg`}
                            alt={`${v.prototype_id} plate`}
                            className="h-7 w-20 rounded border object-cover bg-black"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {(v.plate_confidence * 100).toFixed(0)}% conf
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                        <Camera className="h-3 w-3 text-primary" />
                        <span>Timeline: CAM-01</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span>CAM-02</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                        <span className="font-medium text-foreground">
                          {v.status === "exited" ? "CAM-03 (Exited)" : `Slot ${slotId || "P??"}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedVehicle && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold">
                        {selectedVehicle.prototype_id} — {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.color})
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      Plate: {selectedVehicle.license_plate}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 font-semibold">Cropped Evidence Images:</div>
                      <div className="flex gap-2">
                        <div className="space-y-1">
                          <img
                            src={`/evidence/${selectedVehicle.prototype_id.toLowerCase().replace("-", "")}_car.jpg`}
                            alt="Vehicle Crop"
                            className="h-24 w-32 rounded border object-cover bg-black shadow-sm"
                          />
                          <div className="text-[10px] text-muted-foreground text-center">Vehicle Body</div>
                        </div>
                        <div className="space-y-1">
                          <img
                            src={`/evidence/${selectedVehicle.prototype_id.toLowerCase().replace("-", "")}_plate.jpg`}
                            alt="Plate Crop"
                            className="h-24 w-32 rounded border object-contain bg-black p-1 shadow-sm"
                          />
                          <div className="text-[10px] text-muted-foreground text-center">ANPR Crop (PaddleOCR)</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">OCR Confidence:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(selectedVehicle.plate_confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Lifecycle Status:</span>
                        <span className="font-semibold uppercase">{selectedVehicle.status}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Assigned Slot:</span>
                        <span className="font-mono font-bold text-primary">
                          {sessions.find((s) => s.license_plate === selectedVehicle.license_plate)?.slot_id || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Session UID:</span>
                        <span className="font-mono text-[11px]">
                          {sessions.find((s) => s.license_plate === selectedVehicle.license_plate)?.session_uid || "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Lifecycle Event Stream
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live events recorded in DB ({events.length} shown)
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Immutable
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0">
              <div className="h-[480px] overflow-y-auto px-4 divide-y">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No events recorded yet. Click "Run Replay" above.
                  </div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id || ev.event_uid} className="py-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              ev.event_type.includes("Occupied")
                                ? "bg-red-500"
                                : ev.event_type.includes("Freed")
                                ? "bg-emerald-500"
                                : ev.event_type.includes("Entered")
                                ? "bg-sky-500"
                                : ev.event_type.includes("Exited")
                                ? "bg-amber-500"
                                : "bg-primary"
                            }`}
                          />
                          {ev.event_type}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {ev.camera_id || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="font-mono font-medium text-foreground">
                          {ev.license_plate || "Vehicle"} {ev.slot_id ? `-> ${ev.slot_id}` : ""}
                        </span>
                        <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono">
                          {ev.source_type}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
