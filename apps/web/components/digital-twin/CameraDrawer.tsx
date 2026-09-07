"use client";

import React from "react";
import { X, Camera, Eye, Radio, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import type { CameraRole } from "@/types/digitalTwin";

function getRoleBadge(role: CameraRole) {
  switch (role) {
    case "ENTRY":
      return { label: "ENTRY ANPR", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
    case "PARKING_LOT":
      return { label: "PARKING LOT OCCUPANCY", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    case "EXIT":
      return { label: "EXIT & BARRIER", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    default:
      return { label: "ANPR SENSOR", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
  }
}

export function CameraDrawer() {
  const selectedCameraId = useDigitalTwinStore((state) => state.selectedCameraId);
  const selectCamera = useDigitalTwinStore((state) => state.selectCamera);
  const selectSlot = useDigitalTwinStore((state) => state.selectSlot);
  const cameras = useDigitalTwinStore((state) => state.cameras);

  const camera = selectedCameraId ? cameras[selectedCameraId] : null;

  if (!selectedCameraId || !camera) return null;

  const roleMeta = getRoleBadge(camera.role);

  return (
    <div className="fixed right-4 top-20 z-40 w-full max-w-md animate-in slide-in-from-right duration-200">
      <Card className="border-border/80 bg-background/95 shadow-2xl backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold tracking-tight">
                  {camera.name || camera.camera_id}
                </CardTitle>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{camera.camera_id}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => selectCamera(null)}
            aria-label="Close camera feed"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-xs">
          {/* Dynamic Backend Role Banner */}
          <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/20">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary animate-pulse" />
              <div>
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Dynamic Backend Designation
                </div>
                <div className="font-semibold text-foreground">{roleMeta.label}</div>
              </div>
            </div>
            <Badge variant="outline" className={`font-mono text-[11px] font-bold ${roleMeta.color}`}>
              {camera.role}
            </Badge>
          </div>

          {/* Embedded CCTV Video Feed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Live Camera Feed (Carparking-01)
              </span>
              <span className="font-mono text-[10px]">25 FPS • 1080p</span>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
              <video
                key={camera.url}
                src={camera.url}
                controls
                autoPlay
                loop
                muted
                className="h-full w-full object-contain"
              />
              <div className="absolute top-2 left-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                REC • {camera.camera_id}
              </div>
            </div>
          </div>

          {/* Coverage & Field of View */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 p-2.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Floor Plan Position</span>
              <div className="mt-0.5 font-mono text-foreground font-semibold">
                X: {camera.x}, Y: {camera.y}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Field of View / Angle</span>
              <div className="mt-0.5 font-mono text-foreground font-semibold">
                {camera.fov}° FOV @ {camera.angle}°
              </div>
            </div>
          </div>

          {/* Covered Slots */}
          {camera.coverage_slots && camera.coverage_slots.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Assigned Parking Slots ({camera.coverage_slots.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {camera.coverage_slots.map((slotId) => (
                  <Button
                    key={slotId}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs font-mono"
                    onClick={() => selectSlot(slotId)}
                  >
                    <MapPin className="h-2.5 w-2.5 mr-1 text-primary" />
                    {slotId}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
