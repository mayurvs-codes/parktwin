"use client";

import React from "react";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPortalStore } from "@/store/useUserPortalStore";

interface UserNavigationHUDProps {
  onArrive?: () => void;
  onExitConfirm?: () => void;
}

/**
 * UserNavigationHUD:
 * Simple, glanceable navigation HUD that shows ONLY the current instruction.
 * Zero paragraphs. High-contrast typography and directional icons.
 */
export function UserNavigationHUD({ onArrive, onExitConfirm }: UserNavigationHUDProps) {
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const navigationMode = useUserPortalStore((s) => s.navigationMode);
  const currentRoute = useUserPortalStore((s) => s.currentRoute);
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId) || (activeVehicleId === "VEH-001" ? "SP-07" : null);

  const advanceNavigationStep = useUserPortalStore((s) => s.advanceNavigationStep);
  const arriveAtSpace = useUserPortalStore((s) => s.arriveAtSpace);
  const reachGateway = useUserPortalStore((s) => s.reachGateway);
  const confirmExit = useUserPortalStore((s) => s.confirmExit);

  const isExitMode = navigationMode === "SPACE_TO_EXIT" || journeyStep === "NAVIGATING_TO_EXIT" || journeyStep === "AT_GATEWAY";
  const distance = currentRoute?.distanceRemainingMeters ?? (isExitMode ? 74 : 86);

  // Derive simple single instruction
  let instructionMain = "Continue straight";
  let instructionSub = `${distance} m`;
  let InstructionIcon = ArrowUp;

  if (isExitMode) {
    if (journeyStep === "AT_GATEWAY" || journeyStep === "EXIT_CONFIRMED" || journeyStep === "SESSION_COMPLETE") {
      instructionMain = "✓ Arrived";
      instructionSub = "ACCESS_POINT_B2 Exit";
      InstructionIcon = CheckCircle2;
    } else if (distance <= 15) {
      instructionMain = "Exit gate ahead";
      instructionSub = `${distance} m`;
      InstructionIcon = ArrowUp;
    } else if (distance <= 45) {
      instructionMain = "Turn right to ramp";
      instructionSub = `${distance} m`;
      InstructionIcon = CornerUpRight;
    } else {
      instructionMain = "Continue straight";
      instructionSub = `${distance} m`;
      InstructionIcon = ArrowUp;
    }
  } else {
    if (journeyStep === "PARKED" || journeyStep === "PARKING_SESSION") {
      instructionMain = "✓ Arrived";
      instructionSub = assignedSpaceId || "Assigned Bay";
      InstructionIcon = CheckCircle2;
    } else if (distance <= 15) {
      instructionMain = "Parking on your right";
      instructionSub = `${distance} m`;
      InstructionIcon = CornerUpRight;
    } else if (distance <= 40) {
      instructionMain = "Turn left";
      instructionSub = `${distance} m`;
      InstructionIcon = CornerUpLeft;
    } else {
      instructionMain = "Continue straight";
      instructionSub = `${distance} m`;
      InstructionIcon = ArrowUp;
    }
  }

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
      {/* ── Top Floating Navigation HUD Banner ── */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
        <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-sky-500/40 bg-slate-950/95 px-5 py-3.5 backdrop-blur-xl shadow-2xl ring-1 ring-sky-500/20 max-w-lg w-full">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <InstructionIcon className="h-7 w-7" />
          </div>

          <div className="flex-1">
            <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight leading-tight">
              {instructionMain}
            </div>
            <div className="text-sm font-bold text-sky-400 font-mono">
              {instructionSub}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
              VEHICLE
            </span>
            <span className="text-xs font-mono font-bold text-slate-200">
              {activeVehicleId}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Floating Controls ── */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-5 py-3.5 backdrop-blur-xl shadow-2xl">
          <Button
            variant="outline"
            size="sm"
            onClick={advanceNavigationStep}
            className="text-xs font-mono border-slate-700 text-slate-300 hover:text-white h-10 px-3"
            title="Step vehicle forward along route"
          >
            Step Forward
          </Button>

          {journeyStep === "NAVIGATING_TO_SPACE" && (
            <Button
              onClick={handleArriveClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono px-6 text-sm h-10 gap-2 shadow-lg shadow-emerald-950"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>ARRIVED</span>
            </Button>
          )}

          {journeyStep === "NAVIGATING_TO_EXIT" && (
            <Button
              onClick={handleGatewayClick}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono px-6 text-sm h-10 gap-2 shadow-lg shadow-amber-950"
            >
              <Navigation className="h-4 w-4" />
              <span>AT GATEWAY</span>
            </Button>
          )}

          {journeyStep === "AT_GATEWAY" && (
            <Button
              onClick={handleConfirmExitClick}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono px-6 text-sm h-10 gap-2 shadow-lg shadow-sky-950"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>CONFIRM EXIT</span>
            </Button>
          )}

          {journeyStep === "PARKED" && (
            <Button
              onClick={onArrive}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono px-6 text-sm h-10 gap-2"
            >
              <span>VIEW PARKING</span>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
