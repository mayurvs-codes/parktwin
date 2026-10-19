"use client";

import React from "react";
import { useUserPortalStore } from "@/store/useUserPortalStore";

/**
 * UserNavigationOverlay:
 * Sits cleanly above the existing Digital Twin.
 * Displays:
 *   🚗 YOU  → → →  🅿️ SP-07 (or 🚪 EXIT)
 *   Continue straight · 120 m
 */
export function UserNavigationOverlay() {
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId) || (activeVehicleId === "VEH-001" ? "SP-07" : null);
  const navigationMode = useUserPortalStore((s) => s.navigationMode);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const currentRoute = useUserPortalStore((s) => s.currentRoute);

  const isExitMode = navigationMode === "SPACE_TO_EXIT" || journeyStep === "NAVIGATING_TO_EXIT" || journeyStep === "AT_GATEWAY";
  const distance = currentRoute?.distanceRemainingMeters ?? (isExitMode ? 74 : 86);

  let instructionText = "Continue straight";
  if (isExitMode) {
    if (journeyStep === "AT_GATEWAY") {
      instructionText = "Arrived at exit gate";
    } else if (distance <= 20) {
      instructionText = "Exit barrier ahead";
    } else {
      instructionText = "Proceed to exit gate";
    }
  } else {
    if (journeyStep === "PARKED") {
      instructionText = "Arrived at assigned bay";
    } else if (distance <= 20) {
      instructionText = "Parking on your right";
    } else if (distance <= 45) {
      instructionText = "Turn left into aisle";
    } else {
      instructionText = "Continue straight";
    }
  }

  return (
    <div className="pointer-events-none absolute top-4 left-4 right-4 z-20 flex justify-center">
      <div className="pointer-events-auto rounded-2xl border border-sky-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center gap-3 sm:gap-6 ring-1 ring-sky-500/20">
        {/* Trajectory Header: YOU -> DESTINATION */}
        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold">
          <span className="flex items-center gap-1.5 text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            🚗 <span className="text-sky-400">YOU</span> ({activeVehicleId})
          </span>

          <div className="flex items-center text-sky-400 tracking-widest text-xs">
            <span>→</span>
            <span>→</span>
            <span>→</span>
          </div>

          <span className="flex items-center gap-1.5 text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            {isExitMode ? (
              <span className="text-amber-400">🚪 EXIT</span>
            ) : (
              <span className="text-emerald-400">🅿️ {assignedSpaceId}</span>
            )}
          </span>
        </div>

        {/* Small Instruction */}
        <div className="text-center sm:text-left border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
          <div className="text-xs sm:text-sm font-bold text-white font-mono">
            {instructionText}
          </div>
          <div className="text-[11px] font-mono text-sky-400 font-semibold">
            {distance} m
          </div>
        </div>
      </div>
    </div>
  );
}
