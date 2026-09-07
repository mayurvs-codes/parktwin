"use client";

import React from "react";
import {
  Layers3,
  Clock,
  Car,
  Navigation,
  X,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TwinSlotState } from "@/types/digitalTwin";
import type { SessionDTO } from "@/types/parking";
import { STATUS_PALETTE } from "./facilityGeometry";

interface SlotDetailDrawerProps {
  slot: TwinSlotState | null;
  session?: SessionDTO | null;
  onClose: () => void;
  onRequestRoute?: (slotId: string) => void;
  onSelectVehicle?: (plate: string) => void;
  onSelectCamera?: (cameraId: string) => void;
}

export function SlotDetailDrawer({
  slot,
  session,
  onClose,
  onRequestRoute,
  onSelectVehicle,
  onSelectCamera,
}: SlotDetailDrawerProps) {
  if (!slot) return null;

  const status = slot.status || "free";
  const palette = STATUS_PALETTE[status];
  const isOccupied = status === "occupied";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-5 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">Parking Slot {slot.slot_id}</h2>
              <p className="text-xs text-slate-400">{slot.zone || "Car Parking Facility"}</p>
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

        {/* Status Badge Block */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Current Status</span>
            <div className="mt-1">
              <Badge
                variant="outline"
                className={`text-xs font-semibold uppercase tracking-wider ${palette.bg}`}
              >
                {status}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Covering Camera</span>
            <p
              className="text-xs font-mono font-bold text-sky-400 mt-1 cursor-pointer hover:underline"
              onClick={() => onSelectCamera && onSelectCamera(slot.camera_id)}
            >
              {slot.camera_id}
            </p>
          </div>
        </div>

        {/* Occupant Information */}
        {isOccupied && slot.license_plate ? (
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Car className="h-3.5 w-3.5 text-rose-400" />
              Occupying Vehicle
            </h3>

            {/* License Plate Badge */}
            <div className="flex items-center justify-between">
              <div className="border border-slate-700 bg-[#f8fafc] text-slate-950 px-3 py-1 rounded font-mono font-black text-sm tracking-widest">
                {slot.license_plate}
              </div>
              {onSelectVehicle && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-sky-400 hover:text-sky-300"
                  onClick={() => onSelectVehicle(slot.license_plate!)}
                >
                  View Vehicle
                </Button>
              )}
            </div>

            {/* Parking Duration */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] font-medium text-slate-400">Duration</span>
                <p className="text-xs font-mono font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {session?.duration_seconds
                    ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s`
                    : "Active"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-slate-400">Entry Time</span>
                <p className="text-[11px] font-mono text-slate-300 mt-0.5 truncate">
                  {session?.entry_time ? new Date(session.entry_time).toLocaleTimeString() : "Live"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400/80 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-200">Slot is Available</p>
            <p className="text-xs text-slate-400 mt-1">Ready to receive incoming vehicles from Entry Gate.</p>
          </div>
        )}

        {/* Route Calculation Action */}
        <div className="space-y-2">
          <Button
            className="w-full gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-900/30"
            onClick={() => onRequestRoute && onRequestRoute(slot.slot_id)}
          >
            <Navigation className="h-4 w-4" />
            Calculate Navigation Route to {slot.slot_id}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800">
        <Button variant="outline" className="w-full text-xs" onClick={onClose}>
          Close Slot Panel
        </Button>
      </div>
    </div>
  );
}
