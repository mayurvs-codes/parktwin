"use client";

import React from "react";
import { ArrowUpRight, CheckCircle2, Compass, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPortalStore } from "@/store/useUserPortalStore";

interface NavigationHUDProps {
  onArrive?: () => void;
  onExitConfirm?: () => void;
}

/**
 * NavigationHUD: High-contrast driver-facing navigation overlays.
 * Contains Top HUD (destination & turn instructions) and Bottom HUD (distance remaining & action triggers).
 */
export function NavigationHUD({ onArrive, onExitConfirm }: NavigationHUDProps) {
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const navigationMode = useUserPortalStore((s) => s.navigationMode);
  const currentRoute = useUserPortalStore((s) => s.currentRoute);
  const assignedSpace = useUserPortalStore((s) => s.assignedSpace);
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);

  const advanceNavigationStep = useUserPortalStore((s) => s.advanceNavigationStep);
  const arriveAtSpace = useUserPortalStore((s) => s.arriveAtSpace);
  const reachGateway = useUserPortalStore((s) => s.reachGateway);
  const confirmExit = useUserPortalStore((s) => s.confirmExit);

  const isExitMode = navigationMode === "SPACE_TO_EXIT" || journeyStep === "NAVIGATING_TO_EXIT" || journeyStep === "AT_GATEWAY";
  const distance = currentRoute?.distanceRemainingMeters ?? (isExitMode ? 74 : 86);
  const destination = isExitMode
    ? "ACCESS_POINT_B2 · Exit Gateway"
    : `${assignedSpace?.id || (activeVehicleId === "VEH-001" ? "SP-07" : "Target Bay")} · ${assignedSpace?.zone?.split(" ")[0] || "Zone B"} · B2`;

  const handleArriveClick = () => {
    arriveAtSpace();
    onArrive?.();
  };

  const handleGatewayClick = () => {
    reachGateway();
  };

  const handleConfirmExitClick = () => {
    confirmExit();
    onExitConfirm?.();
  };

  return (
    <>
      {/* ── Top HUD Card: Destination & Maneuver Banner ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-sky-500/40 bg-slate-950/90 p-3.5 backdrop-blur-xl shadow-2xl">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${isExitMode ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-sky-500/20 text-sky-400 border border-sky-500/40"}`}>
            <Compass className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-400">
                {isExitMode ? "Exit Navigation · Application State" : "Digital Twin / Application Navigation"}
              </span>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono text-sky-400 border border-sky-500/20">
                {activeVehicleId}
              </span>
            </div>
            <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{destination}</span>
            </div>
          </div>
        </div>

        {/* Live Facility Context Badge */}
        <div className="pointer-events-auto hidden md:flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs font-mono text-slate-300 backdrop-blur-md shadow-lg">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>B2 CARPARK · SINGLE GATEWAY</span>
        </div>
      </div>

      {/* ── Bottom HUD Card: Guidance & Arrival Controls ── */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 sm:p-5 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400 animate-pulse">
                  FOLLOW THE ARROWS
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono tracking-tight">
                {distance} m <span className="text-sm font-normal text-slate-400">remaining</span>
              </div>
            </div>
          </div>

          {/* Action CTAs according to journey state */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={advanceNavigationStep}
              className="text-xs font-mono border-slate-700 text-slate-300 hover:text-white"
              title="Simulate vehicle moving along route"
            >
              Step Forward
            </Button>

            {journeyStep === "NAVIGATING_TO_SPACE" && (
              <Button
                onClick={handleArriveClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 text-sm gap-2 shadow-lg shadow-emerald-950"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>ARRIVED</span>
              </Button>
            )}

            {journeyStep === "NAVIGATING_TO_EXIT" && (
              <Button
                onClick={handleGatewayClick}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 text-sm gap-2 shadow-lg shadow-amber-950"
              >
                <Navigation className="h-4 w-4" />
                <span>AT GATEWAY</span>
              </Button>
            )}

            {journeyStep === "AT_GATEWAY" && (
              <Button
                onClick={handleConfirmExitClick}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 text-sm gap-2 shadow-lg shadow-sky-950"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>CONFIRM EXIT</span>
              </Button>
            )}

            {journeyStep === "PARKED" && (
              <Button
                onClick={onArrive}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 text-sm gap-2"
              >
                <span>VIEW SESSION</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
