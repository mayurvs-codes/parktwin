"use client";

import React from "react";
import { CheckCircle2, Radio } from "lucide-react";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { ACCESS_POINT_B2, isSlotReserved } from "./demoScenarioData";
import { useSharedDemoState } from "@/store/useSharedDemoState";

export function DigitalTwinStatusBar() {
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const cameras = useDemoMovieStore((s) => s.cameras);

  // Authoritative Focused Demo Zone metrics
  const sharedDemoSpaces = useSharedDemoState((s) => s.spaces);
  const sharedViolation = useSharedDemoState((s) => s.violation);
  const focusedList = Object.values(sharedDemoSpaces);
  const focusedOccupied = focusedList.filter((s) => s.status === "OCCUPIED" || s.status === "VIOLATION").length;
  const focusedAvailable = focusedList.filter((s) => s.status === "AVAILABLE").length;
  const focusedReserved = focusedList.filter((s) => s.status === "RESERVED").length;
  const focusedDesignated = focusedList.filter((s) => s.status === "DESIGNATED").length;

  const totalSlots = spaces.length;
  const occupiedSlots = spaces.filter((s) => s.isOccupied).length;
  const reservedSlots = spaces.filter((s) => !s.isOccupied && isSlotReserved(s)).length;
  const availableSlots = spaces.filter((s) => !s.isOccupied && !isSlotReserved(s)).length;
  const activeVehicles = vehicles.filter(
    (v) => v.state !== "UPCOMING" && v.state !== "EXITED"
  ).length;
  const camerasOnline = cameras.filter((c) => c.status === "ONLINE").length;

  return (
    <div className="flex w-full items-center justify-between text-xs font-mono select-none px-2 py-0.5">
      {/* Left: Live Status & Occupancy Breakdown */}
      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-0.5 scrollbar-none">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-extrabold text-emerald-400 uppercase tracking-widest text-[11px]">LIVE</span>
        </div>

        {/* Focused Zone Canonical Strip */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/50 border border-sky-500/30 text-[11px]">
          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">ZONE (20):</span>
          <span className="text-slate-100 font-extrabold">{focusedOccupied} Occ</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400 font-extrabold">{focusedAvailable} Avail</span>
          {focusedReserved > 0 && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400 font-extrabold">{focusedReserved} Res</span>
            </>
          )}
          {focusedDesignated > 0 && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-sky-300 font-extrabold">{focusedDesignated} Desig</span>
            </>
          )}
          {sharedViolation && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-red-400 font-extrabold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                VIOLATION
              </span>
            </>
          )}
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Total Occ</span>
          <span className="text-sm font-extrabold text-slate-100 font-mono">{occupiedSlots}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Available</span>
          <span className="text-sm font-extrabold text-emerald-400 font-mono">{availableSlots}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Reserved</span>
          <span className="text-sm font-extrabold text-amber-400 font-mono">{reservedSlots}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Total</span>
          <span className="text-sm font-extrabold text-slate-300 font-mono">{totalSlots}</span>
        </div>

        <div className="h-3.5 w-px bg-slate-800" />

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Cameras</span>
          <span className="text-sm font-extrabold text-sky-400 font-mono">
            {camerasOnline} <span className="text-[10px] font-normal text-slate-500">/ {cameras.length}</span>
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Vehicles</span>
          <span className="text-sm font-extrabold text-slate-100 font-mono">{activeVehicles}</span>
        </div>
      </div>

      {/* Right: Facility Identity & Gateway */}
      <div className="hidden md:flex items-center gap-3 text-slate-400">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-sky-400" />
          <span className="text-[10px] text-slate-300">Gateway: <strong className="text-slate-200">{ACCESS_POINT_B2.id}</strong></span>
        </div>
        <div className="h-3.5 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">System Online</span>
        </div>
      </div>
    </div>
  );
}
