"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LogOut,
  ArrowRight,
  Video,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useCctvEvidenceModalStore } from "@/store/useCctvEvidenceModalStore";
import { bayLabel } from "@/utils/bayLabel";

export function UserSessionView() {
  const router = useRouter();
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId);
  const assignedSpace = useUserPortalStore((s) => s.assignedSpace);
  const activeSession = useUserPortalStore((s) => s.activeSession);
  const sessionDurationSeconds = useUserPortalStore((s) => s.sessionDurationSeconds);
  const sessionTimerRunning = useUserPortalStore((s) => s.sessionTimerRunning);
  const completedSessions = useUserPortalStore((s) => s.completedSessions);

  const requestExit = useUserPortalStore((s) => s.requestExit);
  const resetJourney = useUserPortalStore((s) => s.resetJourney);

  // Local tick state strictly for forcing UI re-renders every second while active
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!sessionTimerRunning) return;
    const interval = setInterval(() => {
      setTick((t: number) => t + 1);
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setTick((t: number) => t + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sessionTimerRunning]);

  // Derived wall-clock duration from authoritative parkedTimeMs
  const liveDurationSecs =
    activeSession?.parkedTimeMs && !activeSession.exitTime
      ? Math.max(0, Math.floor((Date.now() - activeSession.parkedTimeMs) / 1000))
      : sessionDurationSeconds;

  // Format running duration as HH:MM:SS
  const formatDuration = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const isSessionComplete = journeyStep === "SESSION_COMPLETE";
  const isActivelyParked = journeyStep === "PARKED" || journeyStep === "PARKING_SESSION";
  const isExiting =
    journeyStep === "EXIT_REQUESTED" ||
    journeyStep === "NAVIGATING_TO_EXIT" ||
    journeyStep === "AT_GATEWAY" ||
    journeyStep === "EXIT_CONFIRMED";
  const isEnRoute = !isSessionComplete && !isActivelyParked && !isExiting;

  const lastCompleted = completedSessions[completedSessions.length - 1];

  const handleExitClick = () => {
    requestExit();
    router.push("/user/navigation");
  };

  const getHeaderTitle = () => {
    if (isSessionComplete) return "SESSION COMPLETE";
    if (isActivelyParked) return "PARKING SESSION";
    if (isExiting) return "EXIT IN PROGRESS";
    return "EN ROUTE TO BAY";
  };

  const getHeaderSubtitle = () => {
    if (isSessionComplete) {
      return "Your parking session has been finalized at ACCESS_POINT_B2. Space returned to available.";
    }
    if (isActivelyParked) {
      return "Vehicle actively parked in facility bay. Live duration and gateway tracking active.";
    }
    if (isExiting) {
      return "Vehicle en route to facility exit (ACCESS_POINT_B2). Session closing in progress.";
    }
    return "Vehicle has not yet parked. Live duration counter will activate once you arrive at your bay.";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
              {isSessionComplete
                ? "Completed Journey"
                : isActivelyParked
                ? "Live Parking Session"
                : isExiting
                ? "Exit Guidance"
                : "Navigation in Progress"}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSessionComplete
                  ? "bg-sky-400"
                  : isActivelyParked
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
            {getHeaderTitle()}
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">
            {getHeaderSubtitle()}
          </p>
        </div>

        <Badge
          variant="outline"
          className={`font-mono text-xs font-bold px-3 py-1 self-start sm:self-auto ${
            activeVehicleId === "VEH-001"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-slate-700 bg-slate-800/40 text-slate-300"
          }`}
        >
          ● {activeVehicleId === "VEH-001" ? "PARTIALLY EVIDENCE-BACKED" : "APPLICATION-ONLY"}
        </Badge>
      </div>

      {isSessionComplete ? (
        /* ── SCREEN 7: SESSION COMPLETE SCREEN ── */
        <Card className="border-sky-500/40 bg-gradient-to-br from-slate-900/95 via-slate-950/90 to-sky-950/20 backdrop-blur-xl shadow-2xl overflow-hidden text-center p-6 sm:p-8 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-xs px-3 py-1 mb-2">
              ● EXIT PROCESSED (APP_DECISION)
            </Badge>
            <h2 className="text-2xl font-black font-mono text-white">
              {activeVehicleId}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Parking session completed successfully via application state machine.
            </p>
          </div>

          {/* Final Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">SPACE</span>
              <span className="text-base font-bold font-mono text-white mt-1 block">
                {bayLabel(lastCompleted?.spaceId || assignedSpaceId || "SP-07")}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">DURATION</span>
              <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                {formatDuration(lastCompleted ? lastCompleted.durationSeconds : liveDurationSecs)}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">EXIT TIME</span>
              <span className="text-base font-bold font-mono text-sky-400 mt-1 block">
                {lastCompleted?.exitTime || "—"}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">GATEWAY</span>
              <span className="text-xs font-bold font-mono text-purple-300 mt-2 block truncate">
                ACCESS_POINT_B2 (CONFIGURED)
              </span>
            </div>
          </div>

          {/* Status Note: Space is now available */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs font-mono text-emerald-300 max-w-md mx-auto space-y-1">
            <div>
              ✓ Space <strong>{bayLabel(lastCompleted?.spaceId || assignedSpaceId || "SP-07")}</strong> has transitioned from <strong>OCCUPIED</strong> &rarr; <strong>AVAILABLE</strong> in the shared facility twin.
            </div>
            <div className="text-[11px] text-amber-300/90 pt-1 border-t border-emerald-500/20">
              CCTV Notice: Exit finalized via APP_DECISION. Physical vehicle egress not recorded in CAM-03 clip.
            </div>
          </div>

          {/* CCTV Exit Evidence Trigger */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => useCctvEvidenceModalStore.getState().openModal({ camera: "CAM-03" })}
              className="border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-mono gap-1.5"
            >
              <Video className="h-3.5 w-3.5" />
              <span>View CAM-03 Exit Infrastructure</span>
            </Button>
          </div>

          {/* Back to Dashboard CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/user/dashboard" className="w-full sm:w-auto">
              <Button
                onClick={resetJourney}
                className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-xs h-11 px-8 gap-2 shadow-xl shadow-sky-950"
              >
                <span>BACK TO DASHBOARD</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/user/analytics" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-slate-700 text-slate-300 hover:text-white font-mono text-xs h-11 px-6"
              >
                <span>View Analytics</span>
              </Button>
            </Link>
          </div>
        </Card>
      ) : isExiting ? (
        /* ── SCREEN 6: EXIT NAVIGATION ACTIVE ── */
        <Card className="border-amber-500/40 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardHeader className="p-6 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-xs px-3 py-1">
                ● EXIT NAVIGATION ACTIVE
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                Destination: ACCESS_POINT_B2
              </span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-white mt-3">
              DEPARTING FACILITY
            </CardTitle>
            <CardDescription className="text-sm font-mono text-slate-300">
              Guidance active toward facility egress gateway · Level B2
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-6">
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs font-mono text-amber-200">
              Vehicle is en route to <strong>ACCESS_POINT_B2</strong>. Follow turn-by-turn guidance on the Digital Twin to reach the exit gate.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">VEHICLE</span>
                <span className="text-white font-bold block">{activeVehicleId}</span>
                <span className="text-slate-400 text-[11px]">{vehicleDef.scenario.model}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">DEPARTED BAY</span>
                <span className="text-white font-bold block">{assignedSpaceId || "SP-07"}</span>
                <span className="text-slate-400 text-[11px]">Level B2</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">GATEWAY</span>
                <span className="text-amber-400 font-bold block">ACCESS_POINT_B2</span>
                <span className="text-slate-400 text-[11px]">Exit Barrier</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link href="/user/navigation" className="flex-1">
                <Button
                  size="lg"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-sm h-12 shadow-xl shadow-amber-950 gap-2"
                >
                  <Navigation className="h-5 w-5" />
                  <span>CONTINUE EXIT NAVIGATION</span>
                </Button>
              </Link>
              <Link href="/user/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-slate-700 text-slate-300 hover:text-white font-mono text-sm h-12 px-6"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : isEnRoute ? (
        /* ── SCREEN: EN ROUTE TO SPACE (NOT YET PARKED) ── */
        <Card className="border-sky-500/40 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 to-indigo-500" />
          <CardHeader className="p-6 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300 font-mono text-xs px-3 py-1">
                ● EN ROUTE TO BAY
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                Session Begins Upon Arrival
              </span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-white mt-3">
              Space {assignedSpaceId || (activeVehicleId === "VEH-001" ? "SP-07" : "Pending Selection")}
            </CardTitle>
            <CardDescription className="text-sm font-mono text-slate-300">
              {assignedSpace?.zone || vehicleDef.scenario.zone || "Zone B (Upper Island)"} · Level B2
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-6">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-5 text-center shadow-inner">
              <span className="text-xs font-mono text-sky-400 uppercase tracking-widest block font-bold">
                PARKING SESSION PENDING
              </span>
              <p className="text-sm text-slate-300 font-mono max-w-md mx-auto mt-2">
                Vehicle is currently navigating to bay. The live session duration counter and billing will activate once you arrive and confirm parking at <strong>{assignedSpaceId || "your designated bay"}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">VEHICLE</span>
                <span className="text-white font-bold block">{activeVehicleId}</span>
                <span className="text-slate-400 text-[11px]">{vehicleDef.scenario.model}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">ENTRY GATE</span>
                <span className="text-white font-bold block">ACCESS_POINT_B2</span>
                <span className="text-slate-400 text-[11px]">Level B2</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">TARGET BAY</span>
                <span className="text-sky-400 font-bold block">{assignedSpaceId || (activeVehicleId === "VEH-001" ? "SP-07" : "—")}</span>
                <span className="text-slate-400 text-[11px]">Island 1</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link href="/user/navigation" className="flex-1">
                <Button
                  size="lg"
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-sm h-12 shadow-xl shadow-sky-950 gap-2"
                >
                  <Navigation className="h-5 w-5" />
                  <span>CONTINUE NAVIGATION</span>
                </Button>
              </Link>
              <Link href="/user/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-slate-700 text-slate-300 hover:text-white font-mono text-sm h-12 px-6"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── SCREEN 5: ACTIVE PARKING SESSION VIEW ── */
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-sky-500" />
          <CardHeader className="p-6 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-mono text-xs px-3 py-1">
                ● PARKED · SESSION ACTIVE
              </Badge>
              <span className="text-xs font-mono text-slate-400">
                Entry Gateway Session (ACCESS_POINT_B2)
              </span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-white mt-3">
              Space {assignedSpaceId || (activeVehicleId === "VEH-001" ? "SP-07" : "—")}
            </CardTitle>
            <CardDescription className="text-sm font-mono text-slate-300">
              {assignedSpace?.zone || vehicleDef.scenario.zone || "Zone B (Upper Island)"} · Level B2
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-6">
            {/* Live Ticking Duration Counter */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center shadow-inner">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">
                ELAPSED PARKING DURATION
              </span>
              <div
                suppressHydrationWarning
                className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight mt-2"
              >
                {formatDuration(liveDurationSecs)}
              </div>
              <span className="text-[11px] font-mono text-slate-400 block mt-2">
                Live counter synchronized with demo state
              </span>
            </div>

            {/* Session Timeline Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">VEHICLE</span>
                <span className="text-white font-bold block">{activeVehicleId}</span>
                <span className="text-slate-400 text-[11px]">{vehicleDef.scenario.model}</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">ENTRY TIME</span>
                <span className="text-white font-bold block">
                  {activeSession?.entryTime || vehicleDef.evidence.detectedAt || "—"}
                </span>
                <span className="text-slate-400 text-[11px]">ACCESS_POINT_B2</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs font-mono space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase">PARKED TIME</span>
                <span className="text-white font-bold block">
                  {activeSession?.parkedTime || "—"}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {assignedSpaceId || (activeVehicleId === "VEH-001" ? "SP-07" : "—")}
                </span>
              </div>
            </div>

            {/* Provenance Disclosure for VEH-001 */}
            {activeVehicleId === "VEH-001" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-mono space-y-1.5">
                <div className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                  PROVENANCE DISCLOSURE
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">ANPR BENCHMARK:</span>
                  <span className="text-sky-400 font-bold">KA04MN8049 (Independent benchmark · Track #6)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">CAM-01 CCTV OBSERVATION:</span>
                  <span className="text-emerald-400 font-bold">KA05ML7220 (Visually observed · OCR unverified)</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-amber-500/20">
                  <span className="text-slate-400">IDENTITY LINKAGE:</span>
                  <span className="text-amber-300 font-bold">UNVERIFIED</span>
                </div>
                <div className="text-[10px] text-amber-400/90 text-center font-semibold pt-0.5">
                  ANPR BENCHMARK ≠ PHYSICAL CCTV IDENTITY
                </div>
              </div>
            )}

            {/* Action Trigger: EXIT PARKING */}
            <div className="pt-2 space-y-2">
              <Button
                onClick={handleExitClick}
                size="lg"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-sm h-12 shadow-xl shadow-amber-950 gap-2"
              >
                <LogOut className="h-5 w-5" />
                <span>EXIT PARKING</span>
              </Button>
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => useCctvEvidenceModalStore.getState().openModal({ camera: "CAM-02" })}
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-mono gap-1.5"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>View CAM-02 Bay Evidence</span>
                </Button>
              </div>
              <span className="text-[10px] font-mono text-slate-400 block text-center mt-1">
                Reroutes destination to ACCESS_POINT_B2 on Digital Twin. Bay maneuver is governed by application state (NOT OBSERVED in CAM-02 CCTV clip).
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
