"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { DigitalTwinMap } from "./DigitalTwinMap";

/**
 * UserNavigationView:
 * Driver navigation screen with ONE unified, non-overlapping interface:
 * 1. Top bar: Back to Dashboard, active trajectory (YOU -> Destination), GPS status
 * 2. Center: Canonical 2D Digital Twin Facility Map (full height responsive)
 * 3. Bottom dock: Compact glanceable instruction, distance, Step Forward, primary CTA
 */
export function UserNavigationView() {
  const router = useRouter();

  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId) || (activeVehicleId === "VEH-001" ? "SP-07" : null);
  const navigationMode = useUserPortalStore((s) => s.navigationMode);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const currentRoute = useUserPortalStore((s) => s.currentRoute);

  const startNavigation = useUserPortalStore((s) => s.startNavigation);
  const advanceNavigationStep = useUserPortalStore((s) => s.advanceNavigationStep);
  const arriveAtSpace = useUserPortalStore((s) => s.arriveAtSpace);
  const reachGateway = useUserPortalStore((s) => s.reachGateway);
  const confirmExit = useUserPortalStore((s) => s.confirmExit);

  // Auto-activate navigation mode upon entering navigation view if a space is assigned
  useEffect(() => {
    if (journeyStep === "SPACE_ASSIGNED") {
      startNavigation();
    }
  }, [journeyStep, startNavigation]);

  const isExitMode = navigationMode === "SPACE_TO_EXIT" || journeyStep === "NAVIGATING_TO_EXIT" || journeyStep === "AT_GATEWAY";
  const distance = currentRoute?.distanceRemainingMeters ?? (isExitMode ? 74 : 86);

  // Derive single clean instruction
  let instructionMain = "Continue straight";
  let instructionSub = `${distance} m`;
  let InstructionIcon = ArrowUp;

  if (isExitMode) {
    if (journeyStep === "AT_GATEWAY" || journeyStep === "EXIT_CONFIRMED" || journeyStep === "SESSION_COMPLETE") {
      instructionMain = "Arrived at Exit Gate";
      instructionSub = "ACCESS_POINT_B2";
      InstructionIcon = CheckCircle2;
    } else if (distance <= 15) {
      instructionMain = "Exit Barrier Ahead";
      instructionSub = `${distance} m`;
      InstructionIcon = ArrowUp;
    } else if (distance <= 45) {
      instructionMain = "Turn Right to Ramp";
      instructionSub = `${distance} m`;
      InstructionIcon = CornerUpRight;
    } else {
      instructionMain = "Proceed to Exit Gate";
      instructionSub = `${distance} m`;
      InstructionIcon = ArrowUp;
    }
  } else {
    if (journeyStep === "PARKED" || journeyStep === "PARKING_SESSION") {
      instructionMain = "Arrived at Bay";
      instructionSub = assignedSpaceId || "SP-07";
      InstructionIcon = CheckCircle2;
    } else if (distance <= 15) {
      instructionMain = "Parking on your right";
      instructionSub = `${distance} m`;
      InstructionIcon = CornerUpRight;
    } else if (distance <= 40) {
      instructionMain = "Turn left into aisle";
      instructionSub = `${distance} m`;
      InstructionIcon = CornerUpLeft;
    } else {
      instructionMain = "Continue straight";
      instructionSub = `${distance} m`;
      InstructionIcon = ArrowUp;
    }
  }

  const handleArrive = () => {
    arriveAtSpace();
    router.push("/user/parking/session");
  };

  const handleGateway = () => {
    reachGateway();
  };

  const handleExitConfirm = () => {
    confirmExit();
    router.push("/user/parking/session");
  };

  const handleExitNavigation = () => {
    router.push("/user/dashboard");
  };

  return (
    <div className="w-full flex-1 min-h-[460px] flex flex-col rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* ── TOP BAR: Back + Navigation Status (Clean, single top bar) ── */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md z-10">
        <Link href="/user/dashboard">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-900 px-2 sm:px-3">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold">
          <span className="text-sky-400 bg-sky-950/60 px-2 sm:px-2.5 py-0.5 rounded border border-sky-800">
            🚗 {activeVehicleId}
          </span>
          <span className="text-slate-500">→</span>
          <span className={isExitMode ? "text-amber-400 bg-amber-950/60 px-2 sm:px-2.5 py-0.5 rounded border border-amber-800" : "text-emerald-400 bg-emerald-950/60 px-2 sm:px-2.5 py-0.5 rounded border border-emerald-800"}>
            {isExitMode ? "🚪 EXIT GATE" : `🅿️ ${assignedSpaceId || "SP-07"}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex border-sky-500/40 bg-sky-500/10 text-sky-300 font-mono text-[10px]">
            ● LIVE GPS GUIDANCE
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitNavigation}
            className="h-8 text-xs font-mono text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 px-2"
          >
            Exit Navigation
          </Button>
        </div>
      </div>

      {/* ── CENTER: Canonical Digital Twin (HERO) ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <DigitalTwinMap />
      </div>

      {/* ── BOTTOM: Docked Navigation Instruction & Action Dock ── */}
      <div className="shrink-0 px-3 sm:px-4 py-2.5 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md z-10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Instruction Icon + Turn text */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <InstructionIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black font-mono text-white leading-tight">
              {instructionMain}
            </div>
            <div className="text-[11px] font-bold font-mono text-sky-400">
              {instructionSub}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={advanceNavigationStep}
            className="h-8 text-[11px] font-mono border-slate-700 text-slate-300 hover:text-white px-2.5"
            title="Advance simulated vehicle position along route"
          >
            Step Forward
          </Button>

          {(journeyStep === "NAVIGATING_TO_SPACE" || journeyStep === "SPACE_ASSIGNED") && (
            <Button
              onClick={handleArrive}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs gap-1.5 shadow-lg shadow-emerald-950"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>ARRIVED</span>
            </Button>
          )}

          {journeyStep === "NAVIGATING_TO_EXIT" && (
            <Button
              onClick={handleGateway}
              className="h-8 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-xs gap-1.5 shadow-lg shadow-amber-950"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>AT GATEWAY</span>
            </Button>
          )}

          {journeyStep === "AT_GATEWAY" && (
            <Button
              onClick={handleExitConfirm}
              className="h-8 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-xs gap-1.5 shadow-lg shadow-sky-950"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>CONFIRM EXIT</span>
            </Button>
          )}

          {journeyStep === "PARKED" && (
            <Button
              onClick={handleArrive}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs gap-1.5"
            >
              <span>VIEW PARKING</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
