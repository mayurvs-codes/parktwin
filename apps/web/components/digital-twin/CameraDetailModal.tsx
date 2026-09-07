"use client";

import React from "react";
import { Video, X, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TwinCameraState } from "@/types/digitalTwin";
import { FACILITY_CAMERAS } from "./facilityGeometry";

interface CameraDetailModalProps {
  camera: TwinCameraState | null;
  videoUrl?: string | null;
  onClose: () => void;
}

export function CameraDetailModal({
  camera,
  videoUrl,
  onClose,
}: CameraDetailModalProps) {
  if (!camera && !videoUrl) return null;

  const camId = camera?.camera_id || "CCTV";
  const geom = camera ? FACILITY_CAMERAS[camId] : null;
  const name = camera?.name || geom?.name || "CCTV Feed";
  const role = camera?.role || geom?.defaultRole || "UNKNOWN";
  const status = camera?.status || "online";
  const coverageSlots = camera?.coverage_slots || geom?.coverage_slots || [];

  const streamSrc = videoUrl || camera?.url || geom?.url || "/videos/cam1_entry_gate.mp4";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">{name}</h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-sky-500/30 bg-sky-500/10 text-sky-400"
                >
                  {camId}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wider border-purple-500/30 bg-purple-500/10 text-purple-400 font-semibold"
                >
                  ROLE: {role}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Carparking-01 B2 Real-Time CCTV Optical Sensor Stream
              </p>
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

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black">
          <video
            src={streamSrc}
            autoPlay
            loop
            muted
            controls
            playsInline
            className="w-full h-full object-contain"
          />

          {/* Live Overlay Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-white pointer-events-none">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold text-red-400">LIVE FEED</span>
            <span className="text-slate-400 border-l border-slate-700 pl-2">1080p @ 30 FPS</span>
          </div>
        </div>

        {/* Footer Metadata */}
        <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="h-4 w-4 text-emerald-400" />
              Stream Status: <span className="text-emerald-400 capitalize">{status}</span>
            </span>
            {coverageSlots.length > 0 && (
              <span className="flex items-center gap-1.5 font-mono">
                Covered Slots: <span className="text-purple-300 font-bold">{coverageSlots.join(", ")}</span>
              </span>
            )}
          </div>

          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
            Close Stream
          </Button>
        </div>
      </div>
    </div>
  );
}
