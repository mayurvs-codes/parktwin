"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  ParkingSquare,
  AlertTriangle,
  RotateCcw,
  Navigation,
  ChevronDown,
  CheckCircle2,
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "@/store/useSharedDemoState";
import { DigitalTwinMap } from "./DigitalTwinMap";

/**
 * UserDashboardView:
 * Redesigned for Phase 2B Smart Parking Driver Experience.
 * Hierarchy:
 * 1. Compact Top Header (Brand, Carparking-01 · B2, Compact Persona & Demo Controls)
 * 2. Main Hero Workspace:
 *    - Left (~70%): Canonical Digital Twin (visually dominant HERO)
 *    - Right (~30%): Compact Driver Action Panel (Current Status, Destination, Next Action CTA)
 * 3. Collapsible Diagnostics Section (Preserves Provenance Audit for test demarcation)
 */
export function UserDashboardView() {

  // Driver Journey Store
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const rawAssignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId);
  const assignedSpaceId = rawAssignedSpaceId || (activeVehicleId === "VEH-001" ? "SP-07" : null);
  const selectVehicle = useUserPortalStore((s) => s.selectVehicle);
  const assignSpace = useUserPortalStore((s) => s.assignSpace);
  const startNavigation = useUserPortalStore((s) => s.startNavigation);
  const advanceNavigationStep = useUserPortalStore((s) => s.advanceNavigationStep);
  const arriveAtSpace = useUserPortalStore((s) => s.arriveAtSpace);
  const reachGateway = useUserPortalStore((s) => s.reachGateway);
  const confirmExit = useUserPortalStore((s) => s.confirmExit);
  const completeSession = useUserPortalStore((s) => s.completeSession);
  const resetJourney = useUserPortalStore((s) => s.resetJourney);
  const currentRoute = useUserPortalStore((s) => s.currentRoute);
  const navigationMode = useUserPortalStore((s) => s.navigationMode);
  const activeSession = useUserPortalStore((s) => s.activeSession);
  const sessionDurationSeconds = useUserPortalStore((s) => s.sessionDurationSeconds);
  const sessionTimerRunning = useUserPortalStore((s) => s.sessionTimerRunning);
  const completedSessions = useUserPortalStore((s) => s.completedSessions);
  const requestExit = useUserPortalStore((s) => s.requestExit);
  const advanceSessionTime = useUserPortalStore((s) => s.advanceSessionTime);
  const checkDurationAlerts = useUserPortalStore((s) => s.checkDurationAlerts);
  const conflictError = useUserPortalStore((s) => s.conflictError);
  const clearConflictError = useUserPortalStore((s) => s.clearConflictError);
  const relocateVehicle = useUserPortalStore((s) => s.relocateVehicle);

  // Authoritative Shared Demo State
  const activePersona = useSharedDemoState((s) => s.activePersona);
  const setActivePersona = useSharedDemoState((s) => s.setActivePersona);
  const sharedSpaces = useSharedDemoState((s) => s.spaces);
  const sharedViolation = useSharedDemoState((s) => s.violation);
  const longStayAlert = useSharedDemoState((s) => s.longStayAlert);
  const triggerViolation = useSharedDemoState((s) => s.triggerViolation);
  const clearViolation = useSharedDemoState((s) => s.clearViolation);
  const reserveSpace = useSharedDemoState((s) => s.reserveSpace);
  const resetAll = useSharedDemoState((s) => s.resetAll);

  // Interactive bay selection
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Live timer tick hook
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!sessionTimerRunning) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      checkDurationAlerts();
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionTimerRunning, checkDurationAlerts]);

  const liveDurationSecs =
    activeSession?.parkedTimeMs && !activeSession.exitTime
      ? Math.max(0, Math.floor((Date.now() - activeSession.parkedTimeMs) / 1000))
      : sessionDurationSeconds;

  const formatDuration = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Filter available spaces in the focused demo zone
  const availableSpaces = FOCUSED_ZONE_SPACE_IDS
    .map((id) => sharedSpaces[id])
    .filter((s): s is NonNullable<typeof s> => s?.status === "AVAILABLE");
  const availableCount = availableSpaces.length;

  // Check if User B has a confirmed reservation
  const userBReservation = Object.values(sharedSpaces).find(
    (s) => s.status === "RESERVED" && s.user === "Registered User B"
  );

  const isNavigatingToSpace = journeyStep === "NAVIGATING_TO_SPACE";
  const isParked = journeyStep === "PARKED" || journeyStep === "PARKING_SESSION";
  const isNavigatingToExit = journeyStep === "NAVIGATING_TO_EXIT";
  const isAtGateway = journeyStep === "AT_GATEWAY";
  const isSessionComplete = journeyStep === "SESSION_COMPLETE";
  const isViolation = Boolean(sharedViolation?.active);

  const currentObservedBay = isViolation ? "SP-11" : (assignedSpaceId || (activePersona === "USER_A" ? "SP-07" : null));
  const isStillInSameSpace =
    Boolean(currentObservedBay) &&
    (sharedSpaces[currentObservedBay || ""]?.vehicleId === activeVehicleId ||
      !sharedSpaces[currentObservedBay || ""]?.vehicleId ||
      sharedSpaces[currentObservedBay || ""]?.status === "OCCUPIED" ||
      sharedSpaces[currentObservedBay || ""]?.status === "VIOLATION");

  const isLongStay =
    Boolean(
      longStayAlert?.active &&
      longStayAlert?.spaceId === currentObservedBay &&
      longStayAlert?.vehicleId === activeVehicleId
    ) || (liveDurationSecs >= 600 && isStillInSameSpace);
  const isWarning = !isLongStay && liveDurationSecs >= 480;

  const isExitMode = navigationMode === "SPACE_TO_EXIT" || isNavigatingToExit || isAtGateway;
  const distance = currentRoute?.distanceRemainingMeters ?? (isExitMode ? 74 : 86);

  let instructionMain = "Continue straight";
  let instructionSub = `${distance} m`;
  let InstructionIcon = ArrowUp;

  if (isExitMode) {
    if (isAtGateway || journeyStep === "EXIT_CONFIRMED" || isSessionComplete) {
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
    if (isParked) {
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
      instructionMain = "Proceed along drive corridor";
      instructionSub = `${distance} m`;
      InstructionIcon = ArrowUp;
    }
  }

  const handleSelectPersona = (persona: "USER_A" | "USER_B" | "GUEST") => {
    setActivePersona(persona);
    setSelectedSlotId(null);
    if (persona === "USER_A") {
      selectVehicle("VEH-001");
    } else if (persona === "USER_B") {
      selectVehicle("VEH-002");
    } else {
      selectVehicle("VEH-003");
    }
  };

  const handleReset = () => {
    setSelectedSlotId(null);
    resetAll();
  };

  const handleSlotClick = (slotId: string) => {
    setSelectedSlotId(slotId);
  };

  const handleStartNav = (targetSlot: string) => {
    assignSpace(targetSlot);
    startNavigation();
    // Hero Digital Twin remains visible on dashboard without full-page redirect
  };

  const currentAssignedId = assignedSpaceId || (activePersona === "USER_A" ? "SP-07" : null);

  // Canonical map highlighted slot:
  // While navigating/parked, keep the assigned bay highlighted
  // In idle state:
  // For User A: SP-07 (or selected bay)
  // For User B: reserved bay if reserved; otherwise selectedSlotId (null until clicked)
  // For Guest: selectedSlotId
  const highlightedSlotId =
    journeyStep !== "NOT_SEEN" && journeyStep !== "ENTRY_DETECTED" && journeyStep !== "VEHICLE_IDENTIFIED" && currentAssignedId
      ? currentAssignedId
      : activePersona === "USER_A"
      ? (selectedSlotId || "SP-07")
      : activePersona === "USER_B"
      ? (userBReservation ? userBReservation.id : selectedSlotId)
      : selectedSlotId;

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto font-sans">
      {/* ── Slot Conflict Alert (if any) ── */}
      {conflictError && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3.5 flex items-center justify-between text-xs font-mono text-rose-300 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-rose-400">Conflict Alert:</span>
            <span>{conflictError}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearConflictError}
            className="h-6 text-[11px] font-mono text-rose-400 hover:text-white hover:bg-rose-500/20 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ── TOP COMPACT HEADER (Section 2) ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: Facility Location & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black font-mono tracking-tight text-white text-base">
                PARKTWIN
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-slate-400">
                Carparking-01 · Level B2
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300 mt-0.5">
              {activePersona === "USER_A" ? (
                <span>REGISTERED DRIVER · <strong className="text-sky-300">USER A</strong> ({activeVehicleId})</span>
              ) : activePersona === "USER_B" ? (
                <span>REGISTERED DRIVER · <strong className="text-amber-300">USER B</strong> ({activeVehicleId})</span>
              ) : (
                <span>GUEST DRIVER · <strong className="text-emerald-300">VISITOR</strong> ({activeVehicleId})</span>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right: Compact Persona & Demo Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Persona Pills */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => handleSelectPersona("USER_A")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activePersona === "USER_A"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              USER A
            </button>

            <button
              type="button"
              onClick={() => handleSelectPersona("USER_B")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activePersona === "USER_B"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              USER B
            </button>

            <button
              type="button"
              onClick={() => handleSelectPersona("GUEST")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activePersona === "GUEST"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              GUEST
            </button>
          </div>

          {/* Quick Demo Utilities */}
          <div className="flex items-center gap-1.5">
            {sharedViolation ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={clearViolation}
                className="h-8 text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white px-2.5"
              >
                Clear Violation
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={triggerViolation}
                className="h-8 text-xs font-mono font-bold border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40 hover:text-white px-2.5 flex items-center gap-1"
                title="Simulate VEH-001 parking in unauthorized SP-11 (driver warned, 10m policy)"
              >
                <AlertTriangle className="h-3 w-3" />
                <span className="hidden sm:inline">Simulate Wrong Space</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={handleReset}
              className="h-8 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 flex items-center gap-1 border border-slate-700"
              title="Reset Demo Baseline (15 Occ / 4 Avail / 1 Desig)"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: DIGITAL TWIN HERO (~70%) + DRIVER ACTION PANEL (~30%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: CANONICAL DIGITAL TWIN (HERO VISUAL 65-75%) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                FACILITY DIGITAL TWIN
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                · Island 1 (SP-01 to SP-20)
              </span>
            </div>

            <Link href="/user/navigation">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs font-mono text-sky-400 hover:text-sky-300 px-2">
                <span>Full GPS View</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {/* Hero Digital Twin Container */}
          <div className="h-[520px] sm:h-[560px] xl:h-[600px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 relative">
            <DigitalTwinMap
              highlightSlotId={highlightedSlotId}
              onSlotSelect={handleSlotClick}
            />
          </div>
        </div>

        {/* Right Column: COMPACT DRIVER ACTION PANEL (25-35%) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <Card className="border-slate-800 bg-slate-900/70 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-slate-400">
                  DRIVER ACTION PANEL
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {availableCount} spaces free
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* ── SITUATION 1: WRONG SPACE / VIOLATION DETECTED ── */}
              {isViolation ? (
                <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{isLongStay ? "Parking Violation (Unresolved)" : "Wrong Space Warning"}</span>
                    </div>
                    <Badge variant={isLongStay ? "destructive" : "outline"} className={`text-[9px] uppercase font-bold ${
                      isLongStay ? "" : "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    }`}>
                      {isLongStay ? "10+ MIN VIOLATION" : isWarning ? "8+ MIN WARNING" : "IMMEDIATE WARNING"}
                    </Badge>
                  </div>

                  {/* Core Required User Warning Notice */}
                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 space-y-1">
                    <p className="text-xs font-bold font-mono text-amber-200">
                      Vehicle is parked in the wrong space. Please move to {sharedViolation?.designatedSpaceId || "SP-07"}.
                    </p>
                    <p className="text-[11px] text-slate-300 font-sans">
                      {isLongStay
                        ? "Vehicle presence in unauthorized bay SP-11 has exceeded 10 minutes. Operational violation alert dispatched to Facility Management."
                        : "A 10-minute grace period applies before escalation to Admin Operational Alert. Please relocate your vehicle immediately."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Expected Space</span>
                      <span className="text-sm font-bold text-sky-400">{sharedViolation?.designatedSpaceId || "SP-07"}</span>
                    </div>
                    <div className="p-2 rounded bg-rose-950/80 border border-rose-800/80">
                      <span className="text-[10px] text-rose-300 uppercase block">Actual Space</span>
                      <span className="text-sm font-bold text-rose-400">{sharedViolation?.actualSpaceId || "SP-11"}</span>
                    </div>
                  </div>

                  {/* Violation Duration Timer Box */}
                  <div className="p-2.5 rounded-lg border border-rose-500/40 bg-slate-950/60 text-center space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase text-rose-400">
                      <Clock className="h-3 w-3" />
                      <span>Dwell Duration in {sharedViolation?.actualSpaceId || "SP-11"}</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-rose-300 tracking-wider">
                      {formatDuration(liveDurationSecs)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Policy Threshold: 10:00 {isLongStay ? "· (ESCALATED TO ADMIN)" : "· (Admin alert pending)"}
                    </div>
                  </div>

                  {/* Demo Controls for Violation Duration */}
                  <div className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span>DURATION TIME CONTROLS</span>
                      <span>Policy: 10 min</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => advanceSessionTime(300 - liveDurationSecs)}
                        className="h-6 text-[9px] font-mono border-slate-700 text-slate-300 hover:text-white px-1"
                        title="Advance dwell time to 5 minutes (Normal)"
                      >
                        5m
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => advanceSessionTime(480 - liveDurationSecs)}
                        className="h-6 text-[9px] font-mono border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-1"
                        title="Advance dwell time to 8 minutes (Warning)"
                      >
                        8m (Warn)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => advanceSessionTime(600 - liveDurationSecs)}
                        className="h-6 text-[9px] font-mono border-rose-500/40 text-rose-300 hover:bg-rose-500/10 px-1"
                        title="Advance dwell time to 10 minutes (Escalate to Admin)"
                      >
                        10m (Alert)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => advanceSessionTime(-liveDurationSecs)}
                        className="h-6 text-[9px] font-mono border-slate-700 text-slate-400 hover:text-white px-1"
                        title="Reset dwell duration to 00:00:00"
                      >
                        Reset 0m
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Button
                      onClick={() => {
                        const targetSpace = sharedViolation?.designatedSpaceId || "SP-07";
                        relocateVehicle(targetSpace);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold h-10 gap-2 shadow-lg shadow-emerald-950"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>MOVE TO {sharedViolation?.designatedSpaceId || "SP-07"} (FRESH TIMER)</span>
                    </Button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const targetSpace = sharedViolation?.designatedSpaceId || "SP-07";
                          clearViolation();
                          handleStartNav(targetSpace);
                        }}
                        className="h-8 text-[11px] font-mono border-slate-700 text-slate-300 hover:text-white"
                      >
                        <Navigation className="h-3.5 w-3.5 mr-1" />
                        <span>Navigate</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          clearViolation();
                          requestExit();
                        }}
                        className="h-8 text-[11px] font-mono border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1" />
                        <span>Exit Facility</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isNavigatingToSpace ? (
                /* ── SITUATION 2: LIVE NAVIGATION TO SPACE ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                      LIVE NAVIGATION
                    </span>
                    <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300 font-mono text-[10px]">
                      EN ROUTE
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">DESTINATION</span>
                    <div className="text-3xl font-black font-mono text-white mt-0.5 tracking-tight">
                      {assignedSpaceId || "SP-07"}
                    </div>
                    <span className="text-xs text-slate-300 font-mono block mt-1">
                      Zone B · Level B2 · Aisle Guidance
                    </span>
                  </div>

                  {/* Navigation Guidance Box */}
                  <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-950/20 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
                      <InstructionIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-white">
                        {instructionMain}
                      </div>
                      <div className="text-[11px] font-mono text-sky-300 font-bold">
                        {instructionSub}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Control Buttons */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={advanceNavigationStep}
                        className="h-10 text-xs font-mono border-slate-700 text-slate-300 hover:text-white"
                      >
                        Step Forward
                      </Button>
                      <Button
                        onClick={() => arriveAtSpace()}
                        className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold gap-1.5 shadow-lg shadow-emerald-950"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>PARK VEHICLE</span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetJourney()}
                      className="w-full h-7 text-[11px] font-mono text-slate-500 hover:text-slate-300"
                    >
                      Cancel Navigation
                    </Button>
                  </div>
                </div>
              ) : isParked ? (
                /* ── SITUATION 3: ACTIVELY PARKED (TIMER HERO PER EXCEPTION) ── */
                <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            isLongStay
                              ? "text-rose-400"
                              : isWarning
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {isLongStay ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                          ) : (
                            <span
                              className={`h-2 w-2 rounded-full animate-pulse ${
                                isWarning ? "bg-amber-400" : "bg-emerald-400"
                              }`}
                            />
                          )}
                          {isLongStay ? "LONG-STAY DURATION ALERT" : isWarning ? "DURATION WARNING" : "ACTIVE SESSION"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] ${
                            isLongStay
                              ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                              : isWarning
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          {isLongStay ? "10+ MIN OVERSTAY" : isWarning ? "8+ MIN WARNING" : "VEHICLE PARKED"}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">YOUR SPACE</span>
                        <div className="text-3xl font-black font-mono text-white mt-0.5 tracking-tight">
                          {assignedSpaceId || "SP-07"}
                        </div>
                        <span className="text-xs text-slate-300 font-mono block mt-0.5">
                          Zone B · Level B2 · {activeVehicleId}
                        </span>
                      </div>

                      {/* Prominent Live Timer Box */}
                      <div
                        className={`p-4 rounded-xl border text-center space-y-1 shadow-lg transition-all ${
                          isLongStay
                            ? "border-rose-500/50 bg-rose-950/30 shadow-rose-950/20"
                            : isWarning
                            ? "border-amber-500/40 bg-amber-950/20 shadow-amber-950/20"
                            : "border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/20"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${
                            isLongStay ? "text-rose-400 font-bold" : isWarning ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>Elapsed Duration</span>
                        </div>
                        <div
                          className={`text-4xl font-black font-mono tracking-wider ${
                            isLongStay ? "text-rose-300" : isWarning ? "text-amber-300" : "text-emerald-300"
                          }`}
                        >
                          {formatDuration(liveDurationSecs)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Parked at {activeSession?.parkedTime || "Recorded"}
                        </div>
                      </div>

                      {/* Long-Stay Alert / Warning Message Box */}
                      {isLongStay ? (
                        <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-left space-y-1.5">
                          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold font-mono">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>10-Minute Limit Exceeded</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                            Vehicle has exceeded standard parking threshold of 10 minutes in space {assignedSpaceId || "SP-07"}. Continuous occupancy verified in the same bay. Operational alert dispatched to facility management.
                          </p>
                        </div>
                      ) : isWarning ? (
                        <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-left space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold font-mono">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>Approaching 10-Minute Threshold</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans">
                            Standard parking session limit is 10 minutes. Please prepare to exit or request extended stay.
                          </p>
                        </div>
                      ) : null}

                      {/* Demo Time Control Controls */}
                      <div className="p-2.5 rounded-lg border border-slate-700/60 bg-slate-900/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-sky-400" />
                            DEMO TIME CONTROLS
                          </span>
                          <span className="text-slate-500">Policy: 10 min</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => advanceSessionTime(300 - liveDurationSecs)}
                            className="h-7 text-[10px] font-mono border-slate-700 text-slate-300 hover:text-white px-1"
                            title="Set duration to 5 minutes (Normal)"
                          >
                            5m
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => advanceSessionTime(480 - liveDurationSecs)}
                            className="h-7 text-[10px] font-mono border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 px-1"
                            title="Set duration to 8 minutes (Warning)"
                          >
                            8m (Warn)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => advanceSessionTime(600 - liveDurationSecs)}
                            className="h-7 text-[10px] font-mono border-rose-500/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 px-1"
                            title="Set duration to 10 minutes (Long-Stay Alert)"
                          >
                            10m (Alert)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => advanceSessionTime(-liveDurationSecs)}
                            className="h-7 text-[10px] font-mono border-slate-700 text-slate-400 hover:text-white px-1"
                            title="Reset timer to 00:00:00"
                          >
                            Reset 0m
                          </Button>
                        </div>

                        {/* Relocation Demo Control */}
                        <div className="pt-1.5 border-t border-slate-800 space-y-1">
                          {selectedSlotId && selectedSlotId !== assignedSpaceId && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                relocateVehicle(selectedSlotId);
                                setSelectedSlotId(null);
                              }}
                              className="w-full h-7 text-[10px] font-mono font-bold bg-sky-600/20 text-sky-300 border border-sky-500/40 hover:bg-sky-600/30"
                            >
                              Move Vehicle to {selectedSlotId} (Fresh Timer)
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => relocateVehicle(assignedSpaceId === "SP-11" ? "SP-07" : "SP-11")}
                            className="w-full h-6 text-[10px] font-mono text-slate-400 hover:text-sky-300"
                          >
                            ⇄ Relocate to {assignedSpaceId === "SP-11" ? "SP-07" : "SP-11"}
                          </Button>
                        </div>
                      </div>

                      <Button
                        onClick={() => requestExit()}
                        className={`w-full font-mono text-xs font-bold h-11 gap-2 shadow-lg ${
                          isLongStay
                            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950"
                            : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950"
                        }`}
                      >
                        <Navigation className="h-4 w-4" />
                        <span>REQUEST EXIT / NAVIGATE TO EXIT</span>
                      </Button>

                      <Link href="/user/parking/session" className="block text-center text-xs font-mono text-sky-400 hover:underline">
                        View Live Session Details →
                      </Link>
                    </div>
              ) : isNavigatingToExit ? (
                /* ── SITUATION 4: EXIT NAVIGATION IN PROGRESS ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      EXIT GUIDANCE
                    </span>
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-[10px]">
                      EXITING
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">DESTINATION</span>
                    <div className="text-2xl font-black font-mono text-white mt-0.5 tracking-tight">
                      ACCESS_POINT_B2
                    </div>
                    <span className="text-xs text-slate-300 font-mono block mt-0.5">
                      Exit Ramp & Gateway Barrier
                    </span>
                  </div>

                  {/* Navigation Guidance Box */}
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      <InstructionIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-white">
                        {instructionMain}
                      </div>
                      <div className="text-[11px] font-mono text-amber-300 font-bold">
                        {instructionSub}
                      </div>
                    </div>
                  </div>

                  {/* Exit Control Buttons */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={advanceNavigationStep}
                        className="h-10 text-xs font-mono border-slate-700 text-slate-300 hover:text-white"
                      >
                        Step Forward
                      </Button>
                      <Button
                        onClick={() => {
                          reachGateway();
                          confirmExit();
                        }}
                        className="h-10 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold gap-1.5 shadow-lg shadow-amber-950"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>CONFIRM EXIT</span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reachGateway()}
                      className="w-full h-7 text-[11px] font-mono text-slate-400 hover:text-white"
                    >
                      Arrive at Barrier Gate
                    </Button>
                  </div>
                </div>
              ) : isAtGateway ? (
                /* ── SITUATION 5: AT EXIT GATEWAY BARRIER ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                      AT EXIT BARRIER
                    </span>
                    <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300 font-mono text-[10px]">
                      GATEWAY
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">BARRIER LOCATION</span>
                    <div className="text-2xl font-black font-mono text-white mt-0.5 tracking-tight">
                      ACCESS_POINT_B2
                    </div>
                    <span className="text-xs text-slate-300 font-mono block mt-0.5">
                      Session duration: {formatDuration(liveDurationSecs)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Vehicle arrived at exit barrier. Confirm exit to lift gate and release parking bay.
                  </p>

                  <Button
                    onClick={() => confirmExit()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold h-11 gap-2 shadow-lg shadow-emerald-950"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>CONFIRM EXIT & RELEASE SPACE</span>
                  </Button>
                </div>
              ) : isSessionComplete ? (
                /* ── SITUATION 6: PARKING SESSION COMPLETE ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      SESSION COMPLETE
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-mono text-[10px]">
                      EXIT VERIFIED
                    </Badge>
                  </div>

                  <div>
                    <div className="text-xl font-black font-mono text-white mt-0.5 tracking-tight">
                      Gate Clearance Verified
                    </div>
                    <p className="text-xs text-slate-300 font-sans mt-1">
                      Vehicle exit recorded at ACCESS_POINT_B2. Parking space has been successfully released and returned to facility availability.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 font-mono text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Status</span>
                      <span className="text-emerald-400 font-bold">Space Released</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Completed Time</span>
                      <span className="text-white">
                        {completedSessions[completedSessions.length - 1]?.exitTime || "Recorded"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Duration</span>
                      <span className="text-white">
                        {formatDuration(completedSessions[completedSessions.length - 1]?.durationSeconds ?? liveDurationSecs)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => completeSession()}
                      className="h-10 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold"
                    >
                      New Journey
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="h-10 border-slate-700 text-slate-300 hover:text-white font-mono text-xs"
                    >
                      Reset Baseline
                    </Button>
                  </div>
                </div>
              ) : activePersona === "USER_A" ? (
                /* ── SITUATION 7: USER A (Registered with Designated Space) ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                      YOUR PARKING
                    </span>
                    <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300 font-mono text-[10px]">
                      DESIGNATED SPACE
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">ASSIGNED BAY</span>
                    <div className="text-4xl font-black font-mono text-white mt-0.5 tracking-tight">
                      SP-07
                    </div>
                    <p className="text-xs text-slate-300 font-mono mt-1">
                      Zone B (Upper Island) · Level B2
                    </p>
                    <p className="text-xs text-sky-200/90 font-sans mt-2">
                      Your designated parking space is <strong>SP-07</strong>. Guaranteed stall, no space searching required.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleStartNav("SP-07")}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-mono text-sm font-bold h-12 shadow-xl shadow-sky-950 gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>NAVIGATE TO SP-07</span>
                  </Button>
                </div>
              ) : activePersona === "USER_B" && userBReservation ? (
                /* ── SITUATION 8: USER B (Reserved Space - After Explicit Reservation) ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      YOUR PARKING
                    </span>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-[10px]">
                        RESERVED SPACE
                      </Badge>
                      <span className="text-[9px] font-mono text-slate-400">
                        No Designated Space
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">RESERVED BAY</span>
                    <div className="text-4xl font-black font-mono text-white mt-0.5 tracking-tight">
                      {userBReservation.id}
                    </div>
                    <p className="text-xs text-slate-300 font-mono mt-1">
                      Zone B (Upper Island) · Level B2
                    </p>
                    <p className="text-xs text-amber-200/90 font-sans mt-2">
                      Space <strong>{userBReservation.id}</strong> is confirmed reserved for Registered User B. Direct navigation ready.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleStartNav(userBReservation.id)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-mono text-sm font-bold h-12 shadow-xl shadow-amber-950 gap-2"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>NAVIGATE TO {userBReservation.id}</span>
                  </Button>
                </div>
              ) : activePersona === "USER_B" ? (
                /* ── SITUATION 9: USER B (Initial - No Designation, No Reservation) ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      PARKING NEEDED
                    </span>
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-[10px]">
                      NO DESIGNATED SPACE
                    </Badge>
                  </div>

                  <div>
                    <div className="text-3xl font-black font-mono text-white mt-0.5 tracking-tight">
                      {availableCount} spaces available
                    </div>
                    <p className="text-xs text-slate-300 font-sans mt-1">
                      Registered driver verified. Select an available bay on the map to reserve.
                    </p>
                  </div>

                  {/* Available Bay Selectors */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Available Demo Bays:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["SP-11", "SP-14", "SP-17", "SP-19"].map((bayId) => {
                        const isSelected = selectedSlotId === bayId;
                        const bay = sharedSpaces[bayId];
                        const isAvail = bay?.status === "AVAILABLE";
                        return (
                          <button
                            key={bayId}
                            type="button"
                            disabled={!isAvail}
                            onClick={() => setSelectedSlotId(bayId)}
                            className={`p-2 rounded-lg border text-left font-mono transition-all flex items-center justify-between ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/20 text-amber-200 ring-1 ring-amber-500"
                                : isAvail
                                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-950/40"
                                : "border-slate-800 bg-slate-900/40 text-slate-500 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <span className="text-xs font-bold">{bayId}</span>
                            <span className="text-[10px]">{isSelected ? "●" : "Free"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot Action Card */}
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white">
                        {selectedSlotId ? `Bay ${selectedSlotId}` : "No Bay Selected"}
                      </span>
                      <Badge variant="outline" className={`text-[9px] ${selectedSlotId ? "border-emerald-500/40 text-emerald-400" : "border-slate-700 text-slate-400"}`}>
                        {selectedSlotId ? "AVAILABLE" : "SELECT BAY"}
                      </Badge>
                    </div>
                    <Button
                      disabled={!selectedSlotId}
                      onClick={() => {
                        if (!selectedSlotId) return;
                        reserveSpace(selectedSlotId, "USER_B");
                        assignSpace(selectedSlotId);
                        setSelectedSlotId(null);
                      }}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold h-11 gap-2 shadow-lg shadow-amber-950 disabled:opacity-50"
                    >
                      <span>{selectedSlotId ? `RESERVE SPACE (${selectedSlotId})` : "SELECT A BAY TO RESERVE"}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── SITUATION 10: GUEST DRIVER ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      PARKING
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-mono text-[10px]">
                      GUEST DRIVER
                    </Badge>
                  </div>

                  <div>
                    <div className="text-3xl font-black font-mono text-white mt-0.5 tracking-tight">
                      {availableCount} spaces available
                    </div>
                    <p className="text-xs text-slate-300 font-sans mt-1">
                      Unregistered visitor access. Select an available bay on the map to navigate.
                    </p>
                  </div>

                  {/* Available Bay Selectors */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Available Bays:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["SP-11", "SP-14", "SP-17", "SP-19"].map((bayId) => {
                        const isSelected = selectedSlotId === bayId;
                        const bay = sharedSpaces[bayId];
                        const isAvail = bay?.status === "AVAILABLE";
                        return (
                          <button
                            key={bayId}
                            type="button"
                            disabled={!isAvail}
                            onClick={() => setSelectedSlotId(bayId)}
                            className={`p-2 rounded-lg border text-left font-mono transition-all flex items-center justify-between ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500"
                                : isAvail
                                ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-950/40"
                                : "border-slate-800 bg-slate-900/40 text-slate-500 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <span className="text-xs font-bold">{bayId}</span>
                            <span className="text-[10px]">{isSelected ? "●" : "Free"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedSlotId && sharedSpaces[selectedSlotId]?.status === "AVAILABLE" ? (
                    <Button
                      onClick={() => handleStartNav(selectedSlotId)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold h-11 gap-2 shadow-lg shadow-emerald-950"
                    >
                      <Navigation className="h-4 w-4" />
                      <span>NAVIGATE TO {selectedSlotId}</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setSelectedSlotId("SP-17")}
                      className="w-full bg-sky-600 hover:bg-sky-500 text-white font-mono text-sm font-bold h-12 shadow-xl shadow-sky-950 gap-2"
                    >
                      <ParkingSquare className="h-4 w-4" />
                      <span>SELECT AVAILABLE BAY (SP-17)</span>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 3. OPTIONAL DIAGNOSTICS & PROVENANCE SECTION (Preserves Test Demarcations) ── */}
      <details className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        <summary className="cursor-pointer p-4 text-xs font-mono font-bold text-slate-400 hover:text-white flex items-center justify-between select-none list-none">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-400" />
            <span>TECHNICAL AUDIT & PHYSICAL EVIDENCE PROVENANCE</span>
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>[ DIAGNOSTICS ]</span>
            <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
          </span>
        </summary>

        <div className="p-4 pt-2 border-t border-slate-800/80" data-testid="vehicle-journey-provenance">
          <CardHeader className="p-0 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold font-mono text-white">
                  VEHICLE JOURNEY: APPLICATION VS PHYSICAL EVIDENCE
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 font-mono">
                  Authoritative distinction between software lifecycle transitions and CCTV sensors.
                </CardDescription>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">EVIDENCE COVERAGE:</span>
                <Badge
                  variant="outline"
                  className={`font-mono text-[11px] font-bold px-3 py-0.5 ${
                    activeVehicleId === "VEH-001"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : "border-slate-700 bg-slate-800/40 text-slate-300"
                  }`}
                >
                  ● {activeVehicleId === "VEH-001" ? "PARTIALLY EVIDENCE-BACKED" : "APPLICATION-ONLY"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 pt-2 space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Column 1: APPLICATION JOURNEY */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-500/30">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    APPLICATION JOURNEY (SOFTWARE)
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/40 text-purple-300">
                    APPLICATION STATE
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">1. GATEWAY ENTRY</span>
                      <span className="text-white font-bold text-xs">Registered at ACCESS_POINT_B2</span>
                      <span className="text-[10px] text-slate-400 block">Session initiated in memory store</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-300">
                      APPLICATION STATE
                    </Badge>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">2. NAVIGATION ROUTING</span>
                      <span className="text-white font-bold text-xs">A* Guidance to {assignedSpaceId || "Bay"}</span>
                      <span className="text-[10px] text-slate-400 block">Waypoint trajectory calculation</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-300">
                      APPLICATION STATE
                    </Badge>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">3. BAY OCCUPANCY</span>
                      <span className="text-white font-bold text-xs">
                        {journeyStep === "PARKED" || journeyStep === "PARKING_SESSION"
                          ? `Parked in ${assignedSpaceId || "Bay"}`
                          : `Target Bay: ${assignedSpaceId || "Bay"}`}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Occupancy flag toggled via arrival event
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-300">
                      APPLICATION STATE
                    </Badge>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">4. FACILITY EXIT</span>
                      <span className="text-white font-bold text-xs">
                        {journeyStep === "SESSION_COMPLETE"
                          ? "Exit Recorded (APP_DECISION)"
                          : "Pending Exit Request"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Bay freed and returned to available in twin
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-300">
                      APP_DECISION
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Column 2: PHYSICAL EVIDENCE */}
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-sky-500/30">
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                    PHYSICAL EVIDENCE (SENSORS)
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-sky-500/40 text-sky-300">
                    DVR / ANPR
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">1. ENTRANCE CCTV (CAM-01)</span>
                      <span className="text-emerald-400 font-bold text-xs block">
                        {activeVehicleId === "VEH-001" ? "KA05ML7220 physically observed at gate" : "CAM-01 Footage"}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {activeVehicleId === "VEH-001" ? "Identity linkage: UNVERIFIED" : "No vehicle linkage in clip"}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 ${
                        activeVehicleId === "VEH-001"
                          ? "border-emerald-500/30 text-emerald-300"
                          : "border-slate-700 text-slate-400"
                      }`}
                    >
                      {activeVehicleId === "VEH-001" ? "OBSERVED / UNVERIFIED" : "APPLICATION-ONLY"}
                    </Badge>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">2. PARKING MANEUVER (CAM-02)</span>
                      <span className="text-rose-400 font-bold text-xs block">NOT OBSERVED IN CCTV</span>
                      <span className="text-[10px] text-slate-400 block">
                        CAM-02 shows stationary parked vehicles only. No parking maneuver recorded.
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-rose-500/30 text-rose-300">
                      NOT OBSERVED
                    </Badge>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">3. PHYSICAL EXIT (CAM-03)</span>
                      <span className="text-rose-400 font-bold text-xs block">NOT OBSERVED IN CCTV</span>
                      <span className="text-[10px] text-slate-400 block">
                        CAM-03 shows stationary exit barrier. Vehicle egress not recorded.
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-rose-500/30 text-rose-300">
                      NOT OBSERVED
                    </Badge>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">4. COMPLETE LIFECYCLE PROOF</span>
                      <span className="text-amber-400 font-bold text-xs block">NOT AVAILABLE IN DATASET</span>
                      <span className="text-[10px] text-slate-400 block">
                        Supplied clips are ~15s and do not record full journey end-to-end.
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-300">
                      AUDIT FACT
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </details>
    </div>
  );
}
