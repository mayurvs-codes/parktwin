"use client";

import React from "react";
import {
  Car,
  Video,
  Navigation,
  ExternalLink,
  X,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RouteData, TwinVehicleState } from "@/types/digitalTwin";
import type { SessionDTO } from "@/types/parking";

interface VehicleDetailDrawerProps {
  vehicle: TwinVehicleState | null;
  activeSession?: SessionDTO | null;
  route?: RouteData | null;
  onClose: () => void;
  onOpenVideo?: (videoUrl: string) => void;
}

export function VehicleDetailDrawer({
  vehicle,
  activeSession: _activeSession,
  route,
  onClose,
  onOpenVideo,
}: VehicleDetailDrawerProps) {
  if (!vehicle) return null;

  const isParked = vehicle.status === "parked";
  const isEntering = vehicle.status === "entering";
  const isExiting = vehicle.status === "exiting" || vehicle.status === "exited";

  // CCTV Video clip provenance
  const videoSource = isEntering
    ? "/videos/cam1_entry_gate.mp4"
    : isParked
    ? "/videos/cam2_parking_bay.mp4"
    : "/videos/cam3_exit_ramp.mp4";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-5 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
      <div className="space-y-5">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Vehicle Profile</h2>
              <p className="text-xs text-slate-400 font-mono">{vehicle.prototype_id || vehicle.id}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Indian HSRP License Plate Display */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-3.5 flex flex-col items-center justify-center shadow-inner">
          <div className="flex items-center gap-2 border-2 border-slate-800 bg-[#f8fafc] text-slate-950 px-4 py-1.5 rounded-md font-mono font-black text-lg tracking-widest shadow-md">
            <div className="flex flex-col items-center text-[7px] text-blue-800 font-bold leading-none pr-1.5 border-r border-slate-400">
              <span>IND</span>
            </div>
            <span>{vehicle.license_plate}</span>
          </div>
          {vehicle.plate_confidence !== undefined && (
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1 font-mono">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              OCR Confidence: {Math.round(vehicle.plate_confidence * 100)}%
            </p>
          )}
        </div>

        {/* Status & Attributes */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Status</span>
            <div className="mt-1">
              <Badge
                variant="outline"
                className={`text-xs font-semibold capitalize ${
                  isParked
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : isExiting
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                {vehicle.status}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Assigned Slot</span>
            <p className="text-sm font-bold text-slate-200 mt-1 font-mono">
              {vehicle.slot_id || "Unassigned"}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Type / Brand</span>
            <p className="text-xs font-medium text-slate-200 mt-1">
              {vehicle.brand || "Sedan"} {vehicle.model || ""}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Color</span>
            <p className="text-xs font-medium text-slate-200 mt-1 capitalize">
              {vehicle.color || "Unknown"}
            </p>
          </div>
        </div>

        {/* Live CCTV Video Evidence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Video className="h-3.5 w-3.5 text-sky-400" />
              Live CCTV Stream Snippet
            </h3>
            {onOpenVideo && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-sky-400 hover:text-sky-300 p-0"
                onClick={() => onOpenVideo(videoSource)}
              >
                Full Feed <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-black aspect-video relative">
            <video
              src={videoSource}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-white flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
              <span>LIVE CCTV</span>
            </div>
          </div>
        </div>

        {/* Shortest Path Navigation Route */}
        {route && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Navigation className="h-3.5 w-3.5 text-indigo-400" />
              Assigned Route ({route.distance_meters}m)
            </h3>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-sky-400">{route.source}</span>
                <span className="text-slate-500">──►</span>
                <span className="text-purple-400">{route.destination}</span>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                {route.directions?.map((step, idx) => (
                  <li key={idx} className="truncate">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer Close Button */}
      <div className="pt-4 border-t border-slate-800">
        <Button variant="outline" className="w-full text-xs" onClick={onClose}>
          Close Vehicle Panel
        </Button>
      </div>
    </div>
  );
}
