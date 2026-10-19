"use client";

import React, { useState } from "react";
import {
  Info,
  Activity,
  X,
  Video,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { useCctvEvidenceModalStore } from "@/store/useCctvEvidenceModalStore";
import type { CctvCameraId } from "@/components/evidence/CctvEvidenceViewer";
import { isSlotReserved } from "./demoScenarioData";
import { useSharedDemoState } from "@/store/useSharedDemoState";

function getAlertContext(spaceId: string, vehicleId?: string | null): string {
  if (spaceId === "SP-07" || vehicleId === "VEH-001") {
    return "Designated User";
  }
  if (spaceId === "SP-14" || vehicleId === "VEH-002") {
    return "Reserved User";
  }
  return "Visitor";
}

export function TwinIntelligenceRail() {
  const [timelineMode, setTimelineMode] = useState<"ALL" | "APPLICATION" | "EVIDENCE">("ALL");

  // Shared End-to-End Demo Store (Authoritative for Focused Zone SP-01 to SP-20)
  const sharedDemoSpaces = useSharedDemoState((s) => s.spaces);
  const sharedSelectedSpaceId = useSharedDemoState((s) => s.selectedSpaceId);
  const sharedActivityEvents = useSharedDemoState((s) => s.activityEvents);
  const longStayAlert = useSharedDemoState((s) => s.longStayAlert);
  const sharedViolation = useSharedDemoState((s) => s.violation);
  const selectSharedSpace = useSharedDemoState((s) => s.selectSpace);

  // Zustand Store bindings
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const cameras = useDemoMovieStore((s) => s.cameras);
  const events = useDemoMovieStore((s) => s.events);
  const selectedVehicleId = useDemoMovieStore((s) => s.selectedVehicleId);
  const rawSelectedSlotId = useDemoMovieStore((s) => s.selectedSlotId);
  const selectedSlotId = rawSelectedSlotId || sharedSelectedSpaceId;
  const selectedCameraId = useDemoMovieStore((s) => s.selectedCameraId);
  const selectVehicle = useDemoMovieStore((s) => s.selectVehicle);
  const selectSlot = useDemoMovieStore((s) => s.selectSlot);
  const selectCamera = useDemoMovieStore((s) => s.selectCamera);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;
  const effectiveSlotId = selectedSlotId || sharedSelectedSpaceId;
  const selectedSharedSpace = effectiveSlotId ? sharedDemoSpaces[effectiveSlotId] : null;
  const selectedSlot = spaces.find((s) => s.id === effectiveSlotId) || null;
  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || null;

  // Focused Zone Counts (Authoritative 20 spaces)
  const focusedSpacesList = Object.values(sharedDemoSpaces);
  const focusedOccupied = focusedSpacesList.filter((s) => s.status === "OCCUPIED" || s.status === "VIOLATION").length;
  const focusedAvailable = focusedSpacesList.filter((s) => s.status === "AVAILABLE").length;
  const _focusedReserved = focusedSpacesList.filter((s) => s.status === "RESERVED").length;
  const focusedDesignated = focusedSpacesList.filter((s) => s.status === "DESIGNATED").length;

  const totalSpaces = spaces.length;
  const occupiedCount = spaces.filter((s) => s.isOccupied).length;
  const _reservedCount = spaces.filter((s) => !s.isOccupied && isSlotReserved(s)).length;
  const availableCount = spaces.filter((s) => !s.isOccupied && !isSlotReserved(s)).length;
  const activeVehicles = vehicles.filter(
    (v) => v.state !== "UPCOMING" && v.state !== "EXITED"
  ).length;
  const onlineCameras = cameras.filter((c) => c.status === "ONLINE").length;

  const handleClearSelection = () => {
    selectVehicle(null);
    selectSlot(null);
    selectSharedSpace(null);
    selectCamera(null);
  };

  return (
    <div className="space-y-3.5 select-none text-xs font-mono">
      {/* ── Section 6: Real Operations Dashboard Operational Alerts ── */}
      {(longStayAlert?.active || (sharedViolation?.active && sharedViolation?.adminAlertActive)) && (
        <Card className="border-red-500/60 bg-red-950/40 shadow-2xl backdrop-blur-md" data-testid="admin-operational-alerts">
          <CardHeader className="pb-2 border-b border-red-500/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                <span>OPERATIONAL ALERTS</span>
              </CardTitle>
              <Badge variant="destructive" className="text-[9px] uppercase font-bold">
                ACTION REQUIRED
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-2.5">
            {/* 1. LONG-STAY ALERT */}
            {longStayAlert?.active && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-950/50 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-amber-300 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    LONG-STAY ALERT
                  </span>
                  <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-300 bg-amber-500/10 font-bold">
                    10:00+ OVERSTAY
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-amber-500/20 pb-0.5">
                    <span className="text-muted-foreground">Vehicle:</span>
                    <strong className="text-white font-mono">{longStayAlert.vehicleId} {longStayAlert.plate ? `(${longStayAlert.plate})` : ""}</strong>
                  </div>
                  <div className="flex justify-between border-b border-amber-500/20 pb-0.5">
                    <span className="text-muted-foreground">Space:</span>
                    <strong className="text-amber-300 font-mono">{longStayAlert.spaceId}</strong>
                  </div>
                  <div className="flex justify-between border-b border-amber-500/20 pb-0.5">
                    <span className="text-muted-foreground">Duration:</span>
                    <strong className="text-amber-300 font-mono">{longStayAlert.formattedDuration || "10:00+"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Context:</span>
                    <strong className="text-sky-300 font-mono">{getAlertContext(longStayAlert.spaceId, longStayAlert.vehicleId)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PARKING VIOLATION ALERT */}
            {sharedViolation?.active && sharedViolation?.adminAlertActive && (
              <div className="rounded-lg border border-red-500/60 bg-red-950/60 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-red-300 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 animate-pulse" />
                    PARKING VIOLATION
                  </span>
                  <Badge variant="destructive" className="text-[9px]">
                    ACTION REQUIRED
                  </Badge>
                </div>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-red-500/20 pb-0.5">
                    <span className="text-muted-foreground">Vehicle:</span>
                    <strong className="text-white font-mono">{sharedViolation.vehicleId} ({sharedViolation.plate})</strong>
                  </div>
                  <div className="flex justify-between border-b border-red-500/20 pb-0.5">
                    <span className="text-muted-foreground">Expected Space:</span>
                    <strong className="text-sky-400 font-mono">{sharedViolation.designatedSpaceId}</strong>
                  </div>
                  <div className="flex justify-between border-b border-red-500/20 pb-0.5">
                    <span className="text-muted-foreground">Actual Space:</span>
                    <strong className="text-red-400 font-mono">{sharedViolation.actualSpaceId}</strong>
                  </div>
                  <div className="flex justify-between border-b border-red-500/20 pb-0.5">
                    <span className="text-muted-foreground">Duration:</span>
                    <strong className="text-amber-300 font-mono">
                      {sharedViolation.durationSeconds ? `${Math.floor(sharedViolation.durationSeconds / 60)}:00+` : "10:00+"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <strong className="text-red-400 font-mono">ACTION REQUIRED</strong>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Contextual Operational Inspector (Adapts Dynamically) ── */}
      <Card className="border-border/70 bg-card/70 backdrop-blur-md shadow-xl transition-all duration-150">
        <CardHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-sky-400" />
              <span>
                {selectedVehicle
                  ? "Vehicle Inspector"
                  : selectedSharedSpace
                  ? (selectedSharedSpace.status === "VIOLATION" ? "Violation Inspector" : "Bay Inspector (Focused Zone)")
                  : selectedSlot
                  ? "Bay Inspector"
                  : selectedCamera
                  ? "Camera Inspector"
                  : "Facility Status"}
              </span>
            </CardTitle>
            {(selectedVehicle || selectedSlot || selectedCamera) ? (
              <button
                onClick={handleClearSelection}
                className="text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded border border-border/40 hover:bg-slate-800"
                title="Clear selection"
              >
                <X className="h-3 w-3" />
                <span>Clear</span>
              </button>
            ) : (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                B2 Canonical
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {selectedVehicle ? (
            /* ── STATE: VEHICLE SELECTED ── */
            <div className="space-y-3">
              {/* PRIMARY ID & STATUS */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-slate-800 shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: selectedVehicle.color }}
                  />
                  <div>
                    <div className="font-mono font-extrabold text-base text-foreground tracking-tight leading-tight">
                      {selectedVehicle.id.startsWith("VEH-") ? selectedVehicle.id : selectedVehicle.plate}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{selectedVehicle.model}</div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      selectedVehicle.state === "PARKED"
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    }`}
                  >
                    {selectedVehicle.state}
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    {selectedVehicle.isTypeA ? "Type A (Tracked)" : "Type B (Static)"}
                  </span>
                </div>
              </div>

              {/* KEY OPERATIONAL INFO (Micro-grid) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Assigned Space</div>
                  <div className="font-mono font-bold text-sm text-sky-400 mt-0.5">
                    {selectedVehicle.assignedSlot || "None"}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Motion State</div>
                  <div className="font-mono font-bold text-sm text-emerald-400 mt-0.5">
                    {selectedVehicle.state}
                  </div>
                </div>
              </div>

              {/* SECONDARY DETAILS */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">License Plate</span>
                  <span className="font-mono font-semibold text-foreground">{selectedVehicle.plate}</span>
                </div>
                {selectedVehicle.isTypeA && (
                  <div className="flex items-center justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Movie Schedule</span>
                    <span className="font-mono text-slate-300">
                      Entry: {selectedVehicle.entryTime}s · Exit: {selectedVehicle.exitStartTime}s
                    </span>
                  </div>
                )}
              </div>

              {/* PROVENANCE DISCLOSURE */}
              {(selectedVehicle.id === "VEH-001" || selectedVehicle.plate === "KA04MN8049") && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-mono space-y-1.5 mt-2">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    PROVENANCE DISCLOSURE
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    <span className="text-foreground font-semibold">ANPR BENCHMARK:</span> KA04MN8049 (Independent benchmark · Track #6)
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    <span className="text-foreground font-semibold">CAM-01 CCTV OBSERVATION:</span> KA05ML7220 (Visually observed, OCR unverified)
                  </div>
                  <div className="text-amber-300 font-bold text-[10px] pt-0.5 border-t border-amber-500/20">
                    IDENTITY LINKAGE: UNVERIFIED
                  </div>
                  <div className="text-amber-400/90 text-[9px] font-semibold text-center pt-0.5">
                    ANPR BENCHMARK ≠ PHYSICAL CCTV IDENTITY
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              {(selectedVehicle.plate === "KA04MN8049" || selectedVehicle.id === "VEH-001") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useCctvEvidenceModalStore.getState().openModal({ camera: "CAM-01", trackId: 6, plate: "KA04MN8049" })}
                  className="w-full mt-2 text-xs font-mono font-semibold border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 gap-1.5 shadow-sm"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Inspect Physical Entry Footage (CAM-01)</span>
                </Button>
              )}
            </div>
          ) : selectedSharedSpace ? (
            /* ── STATE: FOCUSED DEMO ZONE BAY SELECTED (Authoritative) ── */
            <div className="space-y-3">
              {/* PRIMARY ID & STATUS */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                <div>
                  <div className="font-mono font-extrabold text-base text-foreground tracking-tight leading-tight flex items-center gap-1.5">
                    <span>Bay {selectedSharedSpace.name}</span>
                    {selectedSharedSpace.status === "DESIGNATED" && (
                      <span className="text-sky-400 text-sm">★</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Slot Identifier: {selectedSharedSpace.id} (Focused Demo Zone)
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedSharedSpace.status === "VIOLATION"
                      ? "bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse font-extrabold"
                      : selectedSharedSpace.status === "DESIGNATED"
                      ? "bg-sky-500/20 border border-sky-500/50 text-sky-300 font-extrabold"
                      : selectedSharedSpace.status === "RESERVED"
                      ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold"
                      : selectedSharedSpace.status === "OCCUPIED"
                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                      : "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                  }`}
                >
                  {selectedSharedSpace.status}
                </span>
              </div>

              {/* VIOLATION / DWELL MONITORING PANEL FOR SP-11 */}
              {(selectedSharedSpace.status === "VIOLATION" || selectedSharedSpace.isViolation || (sharedViolation?.active && sharedViolation.actualSpaceId === selectedSharedSpace.id)) && (
                sharedViolation?.adminAlertActive ? (
                  <div className="rounded-lg border border-red-500/50 bg-red-950/40 p-3 space-y-2">
                    <div className="flex items-center justify-between text-red-400 font-bold">
                      <span className="flex items-center gap-1.5 uppercase text-xs">
                        <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                        PARKING VIOLATION
                      </span>
                      <Badge variant="destructive" className="text-[9px] uppercase font-bold">
                        ACTION REQUIRED
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-[11px] pt-1">
                      <div className="flex justify-between border-b border-red-500/20 pb-1">
                        <span className="text-muted-foreground">Vehicle:</span>
                        <strong className="text-white font-mono">{selectedSharedSpace.vehicleId ?? sharedViolation?.vehicleId ?? "VEH-001"} ({selectedSharedSpace.plate ?? sharedViolation?.plate ?? "DEMO-001"})</strong>
                      </div>
                      <div className="flex justify-between border-b border-red-500/20 pb-1">
                        <span className="text-muted-foreground">Expected Space:</span>
                        <strong className="text-sky-400 font-mono">{sharedViolation?.designatedSpaceId ?? "SP-07"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-red-500/20 pb-1">
                        <span className="text-muted-foreground">Actual Space:</span>
                        <strong className="text-red-400 font-mono">{selectedSharedSpace.id}</strong>
                      </div>
                      <div className="flex justify-between border-b border-red-500/20 pb-1">
                        <span className="text-muted-foreground">Duration:</span>
                        <strong className="text-amber-300 font-mono">
                          {sharedViolation?.durationSeconds ? `${Math.floor(sharedViolation.durationSeconds / 60)}:00+` : "10:00+"}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="text-muted-foreground">STATUS:</span>
                        <strong className="text-red-400 font-bold">ACTION REQUIRED</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-amber-300 font-bold">
                      <span className="flex items-center gap-1.5 uppercase text-xs">
                        <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
                        DWELL MONITORING (DRIVER WARNED)
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold border-amber-500/40 text-amber-300 bg-amber-500/10">
                        GRACE PERIOD
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-[11px] pt-1">
                      <div className="flex justify-between border-b border-amber-500/20 pb-1">
                        <span className="text-muted-foreground">Vehicle:</span>
                        <strong className="text-white font-mono">{selectedSharedSpace.vehicleId ?? sharedViolation?.vehicleId ?? "VEH-001"} ({selectedSharedSpace.plate ?? sharedViolation?.plate ?? "DEMO-001"})</strong>
                      </div>
                      <div className="flex justify-between border-b border-amber-500/20 pb-1">
                        <span className="text-muted-foreground">Expected Space:</span>
                        <strong className="text-sky-400 font-mono">{sharedViolation?.designatedSpaceId ?? "SP-07"}</strong>
                      </div>
                      <div className="flex justify-between border-b border-amber-500/20 pb-1">
                        <span className="text-muted-foreground">Actual Space:</span>
                        <strong className="text-amber-300 font-mono">{selectedSharedSpace.id}</strong>
                      </div>
                      <div className="flex justify-between border-b border-amber-500/20 pb-1">
                        <span className="text-muted-foreground">Driver Notice:</span>
                        <strong className="text-amber-300 font-mono">Warned on Portal</strong>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="text-muted-foreground">Admin Alert:</span>
                        <strong className="text-slate-300 font-mono">Pending (Threshold: 10:00)</strong>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* LONG-STAY DURATION ALERT PANEL (For Normal Authorized Bays) */}
              {selectedSharedSpace.status !== "VIOLATION" && !selectedSharedSpace.isViolation && (longStayAlert?.spaceId === selectedSharedSpace.id || selectedSharedSpace.isLongStay) && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-950/40 p-3 space-y-2">
                  <div className="flex items-center justify-between text-amber-400 font-bold">
                    <span className="flex items-center gap-1.5 uppercase text-xs">
                      <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
                      LONG-STAY DURATION ALERT
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold border-amber-500/50 text-amber-300 bg-amber-500/10 font-bold">
                      10:00+ OVERSTAY
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-[11px] pt-1">
                    <div className="flex justify-between border-b border-amber-500/20 pb-1">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <strong className="text-white font-mono">{selectedSharedSpace.vehicleId ?? longStayAlert?.vehicleId ?? "VEH-001"}</strong>
                    </div>
                    <div className="flex justify-between border-b border-amber-500/20 pb-1">
                      <span className="text-muted-foreground">Continuous Occupancy:</span>
                      <strong className="text-amber-300 font-mono">{longStayAlert?.formattedDuration ?? "&gt;10m (600s+)"}</strong>
                    </div>
                    <div className="flex justify-between border-b border-amber-500/20 pb-1">
                      <span className="text-muted-foreground">Bay Verification:</span>
                      <strong className="text-emerald-400 font-mono">Confirmed Same Space ({selectedSharedSpace.id})</strong>
                    </div>
                    <div className="flex justify-between border-b border-amber-500/20 pb-1">
                      <span className="text-muted-foreground">Context:</span>
                      <strong className="text-sky-300 font-mono">{getAlertContext(selectedSharedSpace.id, selectedSharedSpace.vehicleId)}</strong>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-muted-foreground">ACTION:</span>
                      <strong className="text-amber-300 font-semibold">Overstay Notification Active</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* KEY OPERATIONAL INFO (Micro-grid) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Zone</div>
                  <div className="font-mono font-bold text-xs text-foreground mt-0.5">
                    Focused Zone
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Camera</div>
                  <div className="font-mono font-bold text-xs text-sky-400 mt-0.5">
                    {selectedSlot?.coveringCamera ?? "CAM-01"}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Rate</div>
                  <div className="font-mono font-bold text-xs text-emerald-400 mt-0.5">
                    $3.50/hr
                  </div>
                </div>
              </div>

              {/* SECONDARY OPERATIONAL DETAILS (Prompt Section 14) */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">User</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedSharedSpace.user ?? (selectedSharedSpace.status === "DESIGNATED" ? "Registered User A" : "None")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Reservation</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedSharedSpace.reservation ?? (selectedSharedSpace.status === "DESIGNATED" ? "ACTIVE" : "None")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Designated For</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedSharedSpace.status === "DESIGNATED"
                      ? (selectedSharedSpace.designatedFor ?? "USER A (VEH-001)")
                      : selectedSharedSpace.status === "RESERVED"
                      ? "NONE"
                      : (selectedSharedSpace.designatedFor ?? "None")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedSharedSpace.vehicleId
                      ? `${selectedSharedSpace.vehicleId} (${selectedSharedSpace.plate ?? "Parked"})`
                      : "None (Available / Empty Bay)"}
                  </span>
                </div>
              </div>
            </div>
          ) : selectedSlot ? (
            /* ── STATE: PARKING BAY SELECTED ── */
            <div className="space-y-3">
              {/* PRIMARY ID & STATUS */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                <div>
                  <div className="font-mono font-extrabold text-base text-foreground tracking-tight leading-tight">
                    Bay {selectedSlot.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">Slot Identifier: {selectedSlot.id}</div>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedSlot.isOccupied
                      ? "bg-slate-800 text-slate-300 border border-slate-700"
                      : isSlotReserved(selectedSlot)
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {selectedSlot.isOccupied
                    ? "OCCUPIED"
                    : isSlotReserved(selectedSlot)
                    ? "RESERVED"
                    : "AVAILABLE"}
                </span>
              </div>

              {/* KEY OPERATIONAL INFO (Micro-grid) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Zone</div>
                  <div className="font-mono font-bold text-xs text-foreground mt-0.5">
                    {selectedSlot.zone}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Camera</div>
                  <div className="font-mono font-bold text-xs text-sky-400 mt-0.5">
                    {selectedSlot.coveringCamera}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2 text-center">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Rate</div>
                  <div className="font-mono font-bold text-xs text-emerald-400 mt-0.5">
                    $3.50/hr
                  </div>
                </div>
              </div>

              {/* SECONDARY DETAILS */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-mono text-foreground">
                    {selectedSlot.orientation === "horizontal" ? "5.0m × 2.5m (Parallel)" : "2.5m × 5.0m (Perpendicular)"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Current Occupant</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedSlot.currentVehicleId === "VEH-001" || ((selectedSlot.id === "P24" || selectedSlot.id === "SP-24") && selectedSlot.isOccupied)
                      ? "VEH-001 (Reserved)"
                      : selectedSlot.isOccupied
                      ? (selectedSlot.currentVehicleId || selectedSlot.currentPlate || "Occupied")
                      : isSlotReserved(selectedSlot)
                      ? "None (Reserved Allocation)"
                      : "None (Available)"}
                  </span>
                </div>
              </div>

              {/* PROVENANCE DISCLOSURE */}
              {(selectedSlot.currentVehicleId === "VEH-001" || selectedSlot.currentPlate === "KA04MN8049" || selectedSlot.id === "SP-24" || selectedSlot.id === "P24" || selectedSlot.name === "P24") && selectedSlot.isOccupied && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-mono space-y-1.5 my-1.5">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    PROVENANCE DISCLOSURE
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    <span className="text-foreground font-semibold">ANPR BENCHMARK:</span> KA04MN8049 (Independent benchmark)
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    <span className="text-foreground font-semibold">CAM-01 CCTV OBSERVATION:</span> KA05ML7220 (Visually observed, OCR unverified)
                  </div>
                  <div className="text-amber-300 font-bold text-[10px] pt-0.5 border-t border-amber-500/20">
                    IDENTITY LINKAGE: UNVERIFIED
                  </div>
                  <div className="text-amber-400/90 text-[9px] font-semibold text-center pt-0.5">
                    ANPR BENCHMARK ≠ PHYSICAL CCTV IDENTITY
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              {selectedSlot.coveringCamera === "CAM-02" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useCctvEvidenceModalStore.getState().openModal({ camera: "CAM-02" })}
                  className="w-full mt-2 text-xs font-mono font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 gap-1.5 shadow-sm"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>View Bay Camera Evidence (CAM-02)</span>
                </Button>
              )}
            </div>
          ) : selectedCamera ? (
            /* ── STATE: CAMERA SELECTED ── */
            <div className="space-y-3">
              {/* PRIMARY ID & STATUS */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                <div>
                  <div className="font-mono font-extrabold text-base text-foreground tracking-tight leading-tight">
                    {selectedCamera.id}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{selectedCamera.label}</div>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedCamera.status === "ONLINE"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {selectedCamera.role} · {selectedCamera.status}
                </span>
              </div>

              {/* KEY OPERATIONAL INFO (Micro-grid) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Stream Status</div>
                  <div className="font-mono font-bold text-xs text-emerald-400 mt-0.5">
                    {selectedCamera.status === "ONLINE" ? "1080p · 30 FPS" : "Standby (Architecture)"}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-border/40 p-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Coordinates</div>
                  <div className="font-mono font-bold text-xs text-slate-300 mt-0.5">
                    ({selectedCamera.x}, {selectedCamera.y})
                  </div>
                </div>
              </div>

              {/* SECONDARY DETAILS */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-mono text-foreground">{selectedCamera.label}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Video Source</span>
                  <span className="font-mono text-foreground">
                    {selectedCamera.videoUrl ? "Recorded Footage" : "Standby / Unconfigured"}
                  </span>
                </div>
              </div>

              {/* ACTIONS */}
              {["CAM-01", "CAM-02", "CAM-03"].includes(selectedCamera.id) && (
                <Button
                  size="sm"
                  onClick={() => useCctvEvidenceModalStore.getState().openModal({ camera: selectedCamera.id as CctvCameraId })}
                  className="w-full mt-2 text-xs font-mono font-bold bg-sky-600 hover:bg-sky-500 text-white gap-1.5 shadow-sm"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>View Live CCTV Footage ({selectedCamera.id})</span>
                </Button>
              )}
            </div>
          ) : (
            /* ── STATE: DEFAULT FACILITY OVERVIEW & HIGH-IMPACT KPIS ── */
            <div className="space-y-3">
              {/* ── FOCUSED ZONE KPI TILES (Primary, Authoritative) ── */}
              <div className="text-[9px] uppercase tracking-widest text-sky-400 font-bold font-mono flex items-center gap-1.5 pb-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                FOCUSED ZONE (20 SPACES)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Occupied KPI */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Occupied
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-slate-100 tracking-tight">
                      {focusedOccupied}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">/ 20</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">Active vehicles in zone</div>
                </div>

                {/* Available KPI */}
                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-2.5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
                    Available
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                      {focusedAvailable}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600">bays</span>
                  </div>
                  <div className="text-[9px] text-emerald-400/70 mt-0.5">Open bays in zone</div>
                </div>

                {/* Designated KPI */}
                <div className="rounded-xl border border-sky-900/40 bg-sky-950/20 p-2.5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/90">
                    Designated
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-sky-300 tracking-tight">
                      {focusedDesignated}
                    </span>
                    <span className="text-[10px] font-mono text-sky-600">bays</span>
                  </div>
                  <div className="text-[9px] text-sky-400/70 mt-0.5">★ SP-07 · User A</div>
                </div>

                {/* Reserved / Cameras KPI */}
                {_focusedReserved > 0 ? (
                  <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-2.5 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                      Reserved
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                        {_focusedReserved}
                      </span>
                      <span className="text-[10px] font-mono text-amber-600">bays</span>
                    </div>
                    <div className="text-[9px] text-amber-400/70 mt-0.5">SP-14 · User B</div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-sky-900/30 bg-sky-950/10 p-2.5 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400/70">
                      Cameras
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono text-sky-400 tracking-tight">
                        {onlineCameras}
                      </span>
                      <span className="text-[10px] font-mono text-sky-600">/ {cameras.length}</span>
                    </div>
                    <div className="text-[9px] text-sky-400/70 mt-0.5">4 Online · 12 Standby</div>
                  </div>
                )}
              </div>

              {/* Facility-level secondary row */}
              <div className="rounded-lg bg-slate-900/50 border border-border/40 p-2 text-[10px] font-mono">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">FULL FACILITY (60 BAYS)</div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Occupied</span>
                  <span className="font-semibold text-slate-100">{occupiedCount} / {totalSpaces}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-400">Available</span>
                  <span className="font-semibold text-emerald-400">{availableCount}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-400">Active Vehicles</span>
                  <span className="font-semibold text-slate-300">{activeVehicles}</span>
                </div>
              </div>

              {/* Engine Subsystems Health Indicators */}
              <div className="rounded-lg bg-slate-900/50 border border-border/40 p-2.5 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Engine Subsystems</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[9px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    HEALTHY
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Vision Pipeline
                    </span>
                    <span className="font-semibold text-emerald-400 text-[10px]">ONLINE</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ANPR Inference
                    </span>
                    <span className="font-semibold text-emerald-400 text-[10px]">ONLINE</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Deterministic Event Bus
                    </span>
                    <span className="font-semibold text-emerald-400 text-[10px]">ONLINE</span>
                  </div>
                </div>
              </div>

              <div className="pt-1 text-center text-muted-foreground text-[10px] border-t border-border/30">
                Click any bay, vehicle, or camera on the map to inspect live telemetry.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Evidence Coverage Summary Card ── */}
      <Card className="border-border/70 bg-card/70 backdrop-blur-md shadow-xl" data-testid="evidence-coverage-card">
        <CardHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Evidence Coverage Summary</span>
            </CardTitle>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
              PARTIALLY EVIDENCE-BACKED
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-3 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">CCTV Sources</span>
            <span className="font-semibold text-foreground">3 (CAM-01, CAM-02, CAM-03)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">ANPR Benchmark Sources</span>
            <span className="font-semibold text-sky-400">1 (test_video.mp4 · Track #6)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Entry Observations</span>
            <span className="font-semibold text-emerald-400">AVAILABLE / PARTIAL</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Parking Maneuver Evidence</span>
            <span className="font-semibold text-rose-400">NOT AVAILABLE (NOT PROVEN)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Physical Exit Evidence</span>
            <span className="font-semibold text-rose-400">NOT AVAILABLE (NOT OBSERVED)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Cross-Camera Identity</span>
            <span className="font-semibold text-amber-400">UNVERIFIED</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Complete Lifecycle Proof</span>
            <span className="font-bold text-rose-400">NOT AVAILABLE</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Activity & Provenance Timeline ── */}
      <Card className="border-border/70 bg-card/70 backdrop-blur-md shadow-xl" data-testid="twin-activity-feed">
        <CardHeader className="pb-2 border-b border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>Timeline: Evidence vs Application</span>
            </CardTitle>
            <button
              onClick={() => useCctvEvidenceModalStore.getState().openModal({ camera: "CAM-01" })}
              className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 border border-sky-500/30 px-2 py-0.5 rounded bg-sky-500/10 transition-colors"
              title="Open CCTV Evidence Player"
            >
              <Video className="h-3 w-3" />
              <span>CCTV EVIDENCE</span>
            </button>
          </div>

          {/* Timeline Filter Toggle */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={timelineMode === "ALL" ? "secondary" : "ghost"}
              onClick={() => setTimelineMode("ALL")}
              className={`h-6 text-[10px] font-mono px-2 ${
                timelineMode === "ALL" ? "bg-slate-800 text-white font-bold" : "text-muted-foreground"
              }`}
            >
              ALL
            </Button>
            <Button
              size="sm"
              variant={timelineMode === "EVIDENCE" ? "secondary" : "ghost"}
              onClick={() => setTimelineMode("EVIDENCE")}
              className={`h-6 text-[10px] font-mono px-2 ${
                timelineMode === "EVIDENCE"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold"
                  : "text-muted-foreground"
              }`}
            >
              EVIDENCE TIMELINE
            </Button>
            <Button
              size="sm"
              variant={timelineMode === "APPLICATION" ? "secondary" : "ghost"}
              onClick={() => setTimelineMode("APPLICATION")}
              className={`h-6 text-[10px] font-mono px-2 ${
                timelineMode === "APPLICATION"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                  : "text-muted-foreground"
              }`}
            >
              APPLICATION TIMELINE
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-3 max-h-56 overflow-y-auto space-y-2 text-xs font-mono scrollbar-thin">
          {/* Evidence Timeline Entries */}
          {(timelineMode === "ALL" || timelineMode === "EVIDENCE") && (
            <div className="space-y-1.5 mb-2">
              <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider pb-1 border-b border-sky-500/20 flex items-center justify-between">
                <span>● EVIDENCE TIMELINE (CCTV / SENSORS)</span>
                <span className="text-[9px] text-muted-foreground font-normal">Ground Truth</span>
              </div>
              <div className="p-2 rounded border border-emerald-500/30 bg-emerald-950/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-bold">CAM-01 (B2 Gate)</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-300">
                    OBSERVED
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  Vehicle entrance observed. Plate visually legible: KA05ML7220. Barrier arm lift verified.
                </p>
              </div>

              <div className="p-2 rounded border border-sky-500/30 bg-sky-950/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-sky-400 font-bold">Track #6 (PaddleOCR)</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-sky-500/40 text-sky-300">
                    INFERRED
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  ANPR benchmark detected KA04MN8049 (98% conf, test_video.mp4). Identity linkage: UNVERIFIED.
                </p>
              </div>

              <div className="p-2 rounded border border-amber-500/30 bg-amber-950/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-amber-400 font-bold">CAM-02 (Bay Cluster)</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/40 text-rose-300">
                    NOT OBSERVED
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  Stationary dwell observed for KA05ND1565 & KA03NY0035. Parking maneuver: NOT OBSERVED IN CCTV.
                </p>
              </div>

              <div className="p-2 rounded border border-rose-500/30 bg-rose-950/20 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-rose-400 font-bold">CAM-03 (Exit Ramp)</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/40 text-rose-300">
                    NOT OBSERVED
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground leading-snug">
                  Exit infrastructure verified. Vehicle egress: NOT OBSERVED IN SOURCE CLIP (roadway clear).
                </p>
              </div>
            </div>
          )}

          {/* Application Timeline Entries */}
          {(timelineMode === "ALL" || timelineMode === "APPLICATION") && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider pb-1 border-b border-purple-500/20 flex items-center justify-between">
                <span>● APPLICATION TIMELINE (DEMO & EVENTS)</span>
                <span className="text-[9px] text-muted-foreground font-normal">State Machine</span>
              </div>

              {/* Authoritative Shared Demo Events (Violations, Reservations, Resets, Long-Stay Alerts) */}
              {sharedActivityEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-2 rounded border space-y-1 ${
                    evt.type === "PARKING_VIOLATION"
                      ? "border-red-500/50 bg-red-950/30 shadow-sm"
                      : evt.type === "LONG_STAY_ALERT"
                      ? "border-amber-500/50 bg-amber-950/30 shadow-sm"
                      : evt.type === "SPACE_RESERVED"
                      ? "border-amber-500/30 bg-amber-950/20"
                      : evt.type === "DESIGNATED_ACCESS"
                      ? "border-sky-500/30 bg-sky-950/20"
                      : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-semibold ${
                        evt.type === "PARKING_VIOLATION"
                          ? "text-red-400 flex items-center gap-1 font-bold"
                          : evt.type === "LONG_STAY_ALERT"
                          ? "text-amber-400 flex items-center gap-1 font-bold"
                          : evt.type === "SPACE_RESERVED"
                          ? "text-amber-300"
                          : evt.type === "DESIGNATED_ACCESS"
                          ? "text-sky-300"
                          : "text-slate-300"
                      }`}
                    >
                      {evt.type === "PARKING_VIOLATION" && <AlertTriangle className="h-3 w-3 text-red-400 animate-pulse" />}
                      {evt.type === "LONG_STAY_ALERT" && <Clock className="h-3 w-3 text-amber-400 animate-pulse" />}
                      {evt.spaceId} {evt.vehicleId ? `· ${evt.vehicleId}` : ""}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{evt.timeLabel}</span>
                      <Badge
                        variant={evt.type === "PARKING_VIOLATION" ? "destructive" : "outline"}
                        className={`text-[8px] px-1 py-0 uppercase ${
                          evt.type === "LONG_STAY_ALERT"
                            ? "border-amber-500/50 text-amber-300 bg-amber-500/10 font-bold"
                            : evt.type === "SPACE_RESERVED"
                            ? "border-amber-500/40 text-amber-300"
                            : evt.type === "DESIGNATED_ACCESS"
                            ? "border-sky-500/40 text-sky-300"
                            : ""
                        }`}
                      >
                        {evt.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[11px] text-foreground leading-snug">{evt.message}</p>
                </div>
              ))}

              {events.length === 0 && sharedActivityEvents.length === 0 ? (
                <p className="py-2 text-center text-muted-foreground text-[11px]">
                  Start the project movie to stream live application state transitions.
                </p>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-2 rounded border border-purple-500/20 bg-purple-950/10 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-purple-300 font-semibold">{evt.plate}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{evt.timeLabel}</span>
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-purple-500/30 text-purple-300">
                          {evt.eventType === "VEHICLE_EXITED" ? "APP_DECISION" : "APPLICATION STATE"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-foreground leading-snug">{evt.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>

        {/* Evidence Coverage Summary Ribbon */}
        <div className="p-2.5 border-t border-border/40 text-[10px] font-mono text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-card/80">
          <span className="text-amber-400 font-bold uppercase tracking-wider">
            ● EVIDENCE COVERAGE SUMMARY:
          </span>
          <span className="text-slate-300">
            Entry: PARTIAL | Maneuver: NOT PROVEN | Exit: NOT OBSERVED
          </span>
        </div>
      </Card>
    </div>
  );
}
