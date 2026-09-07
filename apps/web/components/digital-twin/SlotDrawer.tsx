"use client";

import React, { useState, useEffect } from "react";
import { X, Navigation, Camera, Car, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { fetchNavigationRoute } from "@/services/navigation";
import { formatDateTime, formatDuration } from "@/lib/format";
import { STATUS_COLORS } from "./twinConfig";

export function SlotDrawer() {
  const selectedSlotId = useDigitalTwinStore((state) => state.selectedSlotId);
  const selectSlot = useDigitalTwinStore((state) => state.selectSlot);
  const selectCamera = useDigitalTwinStore((state) => state.selectCamera);
  const selectVehicle = useDigitalTwinStore((state) => state.selectVehicle);
  const slots = useDigitalTwinStore((state) => state.slots);
  const setActiveRoute = useDigitalTwinStore((state) => state.setActiveRoute);

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const slot = selectedSlotId ? slots[selectedSlotId] ?? null : null;

  // Live timer for parking duration
  useEffect(() => {
    if (!slot?.occupied_since) {
      setElapsedSeconds(slot?.duration_seconds || 0);
      return;
    }
    const updateElapsed = () => {
      const start = new Date(slot.occupied_since!).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [slot?.occupied_since, slot?.duration_seconds]);

  if (!selectedSlotId || !slot) return null;

  const statusStyle = STATUS_COLORS[slot.status] || STATUS_COLORS.unknown;

  const handleCalculateRoute = async () => {
    try {
      setIsLoadingRoute(true);
      const routeData = await fetchNavigationRoute(slot.slot_id, "ENTRY_GATE");
      setActiveRoute(routeData);
    } catch (err) {
      console.error("Failed to compute route to slot:", err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleOpenCoveringCamera = () => {
    if (slot.camera_id) {
      selectCamera(slot.camera_id);
    }
  };

  const handleSelectOccupyingVehicle = () => {
    if (slot.license_plate) {
      selectVehicle(slot.license_plate);
    }
  };

  return (
    <div className="fixed right-4 top-20 z-40 w-full max-w-sm animate-in slide-in-from-right duration-200">
      <Card className="border-border/80 bg-background/95 shadow-2xl backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono font-bold text-sm ${statusStyle.bg}`}>
              {slot.slot_id}
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                Slot {slot.slot_id}
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{slot.zone || "Zone A"}</span>
                <span>•</span>
                <span className="font-mono uppercase">{slot.status}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => selectSlot(null)}
            aria-label="Close slot details"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-xs">
          {/* Status Indicator Banner */}
          <div className={`flex items-center justify-between rounded-lg border p-3 ${statusStyle.bg}`}>
            <span className="font-semibold capitalize">Slot Status</span>
            <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
              {slot.status}
            </Badge>
          </div>

          {/* Occupancy info if occupied */}
          {slot.status === "occupied" ? (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Car className="h-3.5 w-3.5" /> License Plate
                </span>
                <button
                  onClick={handleSelectOccupyingVehicle}
                  className="rounded bg-black/80 px-2 py-0.5 font-mono text-xs font-bold text-amber-300 hover:bg-black"
                >
                  {slot.license_plate || "DETECTED"}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Duration
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>

              {slot.occupied_since && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Occupied At</span>
                  <span className="text-foreground">
                    {formatDateTime(slot.occupied_since)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3 text-center">
              <span className="font-medium text-emerald-400">
                Slot is currently free and available for parking.
              </span>
            </div>
          )}

          {/* Camera monitoring station */}
          <div className="flex items-center justify-between rounded-lg border border-border/40 p-2.5">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium text-foreground">{slot.camera_id}</div>
                <div className="text-[11px] text-muted-foreground">Assigned CCTV Station</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleOpenCoveringCamera}
            >
              Feed
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2 font-medium"
              onClick={handleCalculateRoute}
              disabled={isLoadingRoute}
            >
              {isLoadingRoute ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
              Navigate From Entry Gate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
