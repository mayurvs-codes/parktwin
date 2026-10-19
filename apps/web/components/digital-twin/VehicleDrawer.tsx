"use client";

import React, { useState, useEffect } from "react";
import { X, Navigation, Camera, Car, MapPin, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { fetchVehicleNavigation, fetchNavigationRoute } from "@/services/navigation";
import type { RouteData, TwinVehicleState } from "@/types/digitalTwin";

export function VehicleDrawer() {
  const selectedVehicleId = useDigitalTwinStore((state) => state.selectedVehicleId);
  const selectVehicle = useDigitalTwinStore((state) => state.selectVehicle);
  const selectSlot = useDigitalTwinStore((state) => state.selectSlot);
  const selectCamera = useDigitalTwinStore((state) => state.selectCamera);
  const vehicles = useDigitalTwinStore((state) => state.vehicles);
  const slots = useDigitalTwinStore((state) => state.slots);
  const setActiveRoute = useDigitalTwinStore((state) => state.setActiveRoute);

  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // Find vehicle record
  const vehicle: TwinVehicleState | null = selectedVehicleId
    ? vehicles[selectedVehicleId] ||
      vehicles[selectedVehicleId.toUpperCase()] ||
      Object.values(vehicles).find(
        (v) =>
          v.id === selectedVehicleId ||
          v.prototype_id === selectedVehicleId ||
          v.license_plate === selectedVehicleId
      ) ||
      // Fallback: search slots for this license plate
      (() => {
        const matchingSlot = Object.values(slots).find(
          (s) => s.license_plate === selectedVehicleId
        );
        if (matchingSlot) {
          return {
            id: selectedVehicleId,
            prototype_id: "VH-LIVE",
            license_plate: selectedVehicleId,
            vehicle_type: matchingSlot.vehicle_type || "CAR",
            status: "parked" as const,
            slot_id: matchingSlot.slot_id,
            camera_id: matchingSlot.camera_id,
          };
        }
        return null;
      })()
    : null;

  // Resolve assigned slot
  const assignedSlotId =
    vehicle?.slot_id ||
    Object.values(slots).find((s) => s.license_plate === vehicle?.license_plate)?.slot_id;

  // Resolve video URL from camera
  const cameraId = vehicle?.camera_id || (assignedSlotId && ["P01", "P02", "P03", "P04", "P05"].includes(assignedSlotId) ? "CAM-02" : "CAM-03");
  const videoUrl =
    cameraId === "CAM-01"
      ? "/videos/cam1_entry_gate.mp4"
      : cameraId === "CAM-02"
      ? "/videos/cam2_parking_bay.mp4"
      : "/videos/cam3_exit_ramp.mp4";

  // Auto-fetch route when vehicle opens
  useEffect(() => {
    if (!vehicle) return;
    let isCancelled = false;

    const loadRoute = async () => {
      setIsLoadingRoute(true);
      try {
        const vehicleKey = vehicle.prototype_id || vehicle.id || vehicle.license_plate || "";
        let r: RouteData | null = null;
        try {
          r = await fetchVehicleNavigation(vehicleKey);
        } catch {
          // If vehicle route fails, fallback to slot route
          if (assignedSlotId) {
            r = await fetchNavigationRoute(assignedSlotId);
          }
        }
        if (!isCancelled && r) {
          setRoute(r);
        }
      } catch (err) {
        console.error("Failed to load vehicle navigation:", err);
      } finally {
        if (!isCancelled) setIsLoadingRoute(false);
      }
    };

    loadRoute();
    return () => {
      isCancelled = true;
    };
  }, [vehicle, assignedSlotId]);

  if (!selectedVehicleId || !vehicle) return null;

  const handleApplyRoute = () => {
    if (route) {
      setActiveRoute(route);
    }
  };

  return (
    <div className="fixed right-4 top-20 z-40 w-full max-w-sm animate-in slide-in-from-right duration-200">
      <Card className="border-border/80 bg-background/95 shadow-2xl backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                  {vehicle.prototype_id && vehicle.prototype_id.startsWith("VEH-")
                    ? vehicle.prototype_id
                    : (vehicle.license_plate || vehicle.prototype_id || "VEHICLE")}
                </span>
                <Badge
                  variant={
                    vehicle.status === "parked"
                      ? "default"
                      : vehicle.status === "entering"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-[10px] uppercase font-mono"
                >
                  {vehicle.status || "TRACKED"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {vehicle.prototype_id ? `${vehicle.prototype_id} • ` : ""}
                {vehicle.vehicle_type || "Vehicle"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => selectVehicle(null)}
            aria-label="Close vehicle details"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Assigned Stall</span>
              <div className="mt-0.5 font-semibold text-foreground">
                {assignedSlotId ? (
                  <button
                    onClick={() => selectSlot(assignedSlotId)}
                    className="flex items-center gap-1 font-mono text-primary hover:underline"
                  >
                    <MapPin className="h-3 w-3" />
                    Slot {assignedSlotId}
                  </button>
                ) : (
                  "En route / Exit"
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Detection Camera</span>
              <div className="mt-0.5 font-semibold text-foreground">
                {cameraId ? (
                  <button
                    onClick={() => selectCamera(cameraId)}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Camera className="h-3 w-3" />
                    {cameraId}
                  </button>
                ) : (
                  "CAM-01"
                )}
              </div>
            </div>

            {vehicle.brand && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Make & Model</span>
                <div className="mt-0.5 font-medium text-foreground">
                  {vehicle.brand} {vehicle.model || ""}
                </div>
              </div>
            )}

            {vehicle.color && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Vehicle Color</span>
                <div className="mt-0.5 font-medium capitalize text-foreground">
                  {vehicle.color}
                </div>
              </div>
            )}
          </div>

          {/* Provenance Card for VEH-001 or KA04MN8049 */}
          {(vehicle.prototype_id === "VEH-001" || vehicle.license_plate === "KA04MN8049") && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-1 font-mono text-[11px]">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                PROVENANCE DISCLOSURE
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground font-semibold">ANPR BENCHMARK:</span> KA04MN8049 (Independent benchmark)
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground font-semibold">CAM-01 CCTV:</span> KA05ML7220 (Visually observed, OCR unverified)
              </div>
              <div className="text-amber-300 font-bold text-[10px] pt-0.5 border-t border-amber-500/20">
                IDENTITY LINKAGE: UNVERIFIED
              </div>
              <div className="text-amber-400/90 text-[9px] font-semibold text-center pt-0.5">
                ANPR BENCHMARK ≠ PHYSICAL CCTV IDENTITY
              </div>
            </div>
          )}

          {/* Shortest Path Routing Card */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Navigation className="h-3.5 w-3.5" />
                Dijkstra Shortest Path
              </span>
              {route && (
                <span className="font-mono text-[11px] font-bold text-foreground">
                  {route.distance_meters} m
                </span>
              )}
            </div>

            {isLoadingRoute ? (
              <div className="flex items-center justify-center py-3 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Calculating path along floor plan lanes...</span>
              </div>
            ) : route ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>From: <strong className="text-foreground">{route.source}</strong></span>
                  <span>To: <strong className="text-foreground">{route.destination}</strong></span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Hops: <strong className="font-mono text-foreground">{route.path.join(" → ")}</strong>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5 mt-1"
                  onClick={handleApplyRoute}
                >
                  <Navigation className="h-3 w-3" />
                  Highlight Route on Facility Map
                </Button>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                No active route calculated.
              </div>
            )}
          </div>

          {/* CCTV Evidence Video */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-primary" />
                CCTV Evidence Footage
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setShowVideo(!showVideo)}
              >
                {showVideo ? "Hide Video" : "View Clip"}
              </Button>
            </div>

            {showVideo && (
              <div className="overflow-hidden rounded-lg border border-border bg-black aspect-video">
                <video
                  src={videoUrl}
                  autoPlay
                  controls
                  loop
                  muted
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
