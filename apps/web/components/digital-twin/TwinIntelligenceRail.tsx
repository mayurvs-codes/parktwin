"use client";

import React from "react";
import {
  Info,
  Activity,
  X,
  Video,
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
import { bayLabel } from "@/utils/bayLabel";

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
      {(longStayAlert?.active || (sharedViolation?.active && (sharedViolation?.adminAlertActive || (sharedViolation?.durationSeconds ?? 0) >= 480))) && (
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
                    <strong className="text-amber-300 font-mono">{bayLabel(longStayAlert.spaceId)}</strong>
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

            {/* 1b. 8-MINUTE STAGE: grace period ending (driver warned, admin alert not yet raised) */}
            {sharedViolation?.active && !sharedViolation?.adminAlertActive && (sharedViolation?.durationSeconds ?? 0) >= 480 && (
              <div data-testid="duration-warning-alert" className="rounded-lg border border-amber-500/60 bg-amber-950/50 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                  <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  GRACE PERIOD ENDING (8:00+)
                </div>
                <div className="text-[11px] text-amber-100/90 font-mono">
                  {sharedViolation.vehicleId} in {sharedViolation.actualSpaceId} (expected {sharedViolation.designatedSpaceId}) · escalates to admin at 10:00
                </div>
              </div>
            )}

            {/* 2. PARKING VIOLATION ALERT */}
            {sharedViolation?.active && sharedViolation?.adminAlertActive && (
              <div data-testid="operational-violation-alert" className="rounded-lg border border-red-500/60 bg-red-950/60 p-2.5 space-y-2">
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
                    {selectedVehicle.assignedSlot ? bayLabel(selectedVehicle.assignedSlot) : "None"}
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
                  <span>View recorded footage ({selectedCamera.id})</span>
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

              <div className="pt-1 text-center text-muted-foreground text-[10px] border-t border-border/30">
                Click any bay, vehicle, or camera on the map to inspect live telemetry.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent events (violations, long stays, resets) ── */}
      <Card className="border-border/70 bg-card/70 backdrop-blur-md shadow-xl" data-testid="twin-activity-feed">
        <CardHeader className="pb-2 border-b border-border/40">
          <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Recent events</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-1.5 max-h-56 overflow-y-auto">
          {sharedActivityEvents.length === 0 ? (
            <p className="py-2 text-center text-muted-foreground text-[11px]">No events yet.</p>
          ) : (
            sharedActivityEvents.slice(0, 8).map((evt) => (
              <div
                key={evt.id}
                className={`p-2 rounded border space-y-0.5 ${
                  evt.type === "PARKING_VIOLATION"
                    ? "border-red-500/50 bg-red-950/30"
                    : evt.type === "LONG_STAY_ALERT"
                    ? "border-amber-500/50 bg-amber-950/30"
                    : "border-slate-800 bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300">
                  <span>
                    {bayLabel(evt.spaceId)} {evt.vehicleId ? `· ${evt.vehicleId}` : ""}
                  </span>
                  <span className="text-muted-foreground font-normal">{evt.timeLabel}</span>
                </div>
                <p className="text-[11px] text-foreground leading-snug">{evt.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
