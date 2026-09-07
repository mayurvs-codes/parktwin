"use client";

import React from "react";
import {
  Layers,
  Info,
  Activity,
  MapPin,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

export function TwinIntelligenceRail() {
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const cameras = useDemoMovieStore((s) => s.cameras);
  const events = useDemoMovieStore((s) => s.events);
  const selectedVehicleId = useDemoMovieStore((s) => s.selectedVehicleId);
  const selectedSlotId = useDemoMovieStore((s) => s.selectedSlotId);
  const selectedCameraId = useDemoMovieStore((s) => s.selectedCameraId);
  const selectVehicle = useDemoMovieStore((s) => s.selectVehicle);
  const selectSlot = useDemoMovieStore((s) => s.selectSlot);
  const selectCamera = useDemoMovieStore((s) => s.selectCamera);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;
  const selectedSlot = spaces.find((s) => s.id === selectedSlotId) || null;
  const selectedCamera = cameras.find((c) => c.id === selectedCameraId) || null;

  const totalSpaces = spaces.length;
  const occupiedCount = spaces.filter((s) => s.isOccupied).length;
  const availableCount = totalSpaces - occupiedCount;

  const handleClearSelection = () => {
    selectVehicle(null);
    selectSlot(null);
    selectCamera(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Facility Telemetry Summary ── */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-md shadow-lg">
        <CardHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Facility Telemetry</span>
            </CardTitle>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              B2 Canonical
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Facility Level</span>
            <span className="font-mono font-semibold text-foreground">B2 (Level 78.75)</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Operational Spaces</span>
            <span className="font-mono font-semibold text-foreground">{totalSpaces} Bays</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Occupied (GREEN)</span>
            <span className="font-mono font-semibold text-emerald-400">{occupiedCount}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">Available (RED)</span>
            <span className="font-mono font-semibold text-red-400">{availableCount}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">CCTV Matrix</span>
            <span className="font-mono font-semibold text-foreground">16 Verified Plan Cameras</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Access Gateway</span>
            <span className="font-mono text-[11px] font-medium text-sky-400">ACCESS_POINT_B2 (Bidirectional)</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Inspector Panel (Selected Object Telemetry) ── */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-md shadow-lg">
        <CardHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-sky-400" />
              <span>Spatial Inspector</span>
            </CardTitle>
            {(selectedVehicle || selectedSlot || selectedCamera) && (
              <button
                onClick={handleClearSelection}
                className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-3 text-xs">
          {selectedVehicle ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedVehicle.color }}
                />
                <span className="font-mono font-bold text-sm text-foreground">
                  {selectedVehicle.plate}
                </span>
                <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                  {selectedVehicle.isTypeA ? "Type A (Tracked)" : "Type B (Static)"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Vehicle Status</span>
                <span className="font-mono font-semibold text-emerald-400 uppercase">
                  {selectedVehicle.state}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Assigned Space</span>
                <span className="font-mono font-semibold text-foreground">
                  {selectedVehicle.assignedSlot}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Model / Category</span>
                <span className="font-mono text-foreground">{selectedVehicle.model}</span>
              </div>
              {selectedVehicle.isTypeA && (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Movie Schedule</span>
                  <span className="font-mono text-muted-foreground">
                    Entry: {selectedVehicle.entryTime}s · Exit: {selectedVehicle.exitStartTime}s
                  </span>
                </div>
              )}
            </div>
          ) : selectedSlot ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="font-mono font-bold text-sm text-foreground">
                  Bay {selectedSlot.name} ({selectedSlot.id})
                </span>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                    selectedSlot.isOccupied
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {selectedSlot.isOccupied ? "OCCUPIED" : "AVAILABLE"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Zone</span>
                <span className="font-mono text-foreground">{selectedSlot.zone}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Covering CCTV</span>
                <span className="font-mono font-semibold text-sky-400">
                  {selectedSlot.coveringCamera}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Current Occupant</span>
                <span className="font-mono text-foreground">
                  {selectedSlot.currentPlate || "None (Available)"}
                </span>
              </div>
            </div>
          ) : selectedCamera ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="font-mono font-bold text-sm text-foreground">
                  {selectedCamera.id}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  {selectedCamera.role}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Plan Coordinates</span>
                <span className="font-mono text-foreground">
                  ({selectedCamera.x}, {selectedCamera.y})
                </span>
              </div>
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
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <MapPin className="h-6 w-6 mx-auto mb-2 text-slate-500 opacity-60" />
              <p>Click any vehicle, parking bay, or camera on the map to inspect telemetry.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Live Movie Event Feed ── */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-md shadow-lg">
        <CardHeader className="pb-2 border-b border-border/40">
          <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Movie Activity Feed</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 max-h-56 overflow-y-auto space-y-2 text-xs">
          {events.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-[11px]">
              Start the project movie to stream live gate and bay events.
            </p>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="p-2 rounded border border-border/30 bg-background/50 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-primary font-semibold">{evt.plate}</span>
                  <span className="text-muted-foreground">{evt.timeLabel}</span>
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
