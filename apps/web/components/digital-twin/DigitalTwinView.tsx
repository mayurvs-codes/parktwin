"use client";

import React, { useEffect } from "react";
import {
  Layers3,
  Play,
  Pause,
  RotateCcw,
  Video,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { useCctvEvidenceModalStore } from "@/store/useCctvEvidenceModalStore";
import { useSharedDemoState, type PersonaType } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { DigitalTwinMap } from "@/components/user/DigitalTwinMap";
import { TwinIntelligenceRail } from "./TwinIntelligenceRail";
import { DigitalTwinStatusBar } from "./DigitalTwinStatusBar";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DigitalTwinView() {
  const status = useDemoMovieStore((s) => s.status);
  const currentTime = useDemoMovieStore((s) => s.currentTime);
  const totalDuration = useDemoMovieStore((s) => s.totalDuration);
  const speed = useDemoMovieStore((s) => s.speed);
  const startMovie = useDemoMovieStore((s) => s.startMovie);
  const pauseMovie = useDemoMovieStore((s) => s.pauseMovie);
  const resumeMovie = useDemoMovieStore((s) => s.resumeMovie);
  const resetMovie = useDemoMovieStore((s) => s.resetMovie);
  const setSpeed = useDemoMovieStore((s) => s.setSpeed);
  const hydrateFromStorage = useDemoMovieStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Shared Cross-System Demo State
  const activePersona = useSharedDemoState((s) => s.activePersona);
  const setActivePersona = useSharedDemoState((s) => s.setActivePersona);
  const sharedSelectedSpaceId = useSharedDemoState((s) => s.selectedSpaceId);
  const sharedSpaces = useSharedDemoState((s) => s.spaces);
  const sharedViolation = useSharedDemoState((s) => s.violation);
  const triggerViolation = useSharedDemoState((s) => s.triggerViolation);
  const clearViolation = useSharedDemoState((s) => s.clearViolation);
  const resetAllShared = useSharedDemoState((s) => s.resetAll);

  // User Portal Driver State
  const selectVehicle = useUserPortalStore((s) => s.selectVehicle);
  const resetUserDemo = useUserPortalStore((s) => s.resetDemo);

  const spacesList = Object.values(sharedSpaces);
  const occCount = spacesList.filter((s) => s.status === "OCCUPIED" || s.status === "VIOLATION").length;
  const availCount = spacesList.filter((s) => s.status === "AVAILABLE").length;
  const desigCount = spacesList.filter((s) => s.status === "DESIGNATED").length;
  const resCount = spacesList.filter((s) => s.status === "RESERVED").length;

  const handleSelectPersona = (persona: PersonaType) => {
    setActivePersona(persona);
    if (persona === "USER_A") {
      selectVehicle("VEH-001");
    } else if (persona === "USER_B") {
      selectVehicle("VEH-002");
    } else {
      selectVehicle("VEH-003");
    }
  };

  const handleResetBoth = () => {
    resetAllShared();
    resetUserDemo();
    resetMovie();
  };

  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isCompleted = status === "COMPLETED";

  const handlePlayToggle = () => {
    if (isRunning) {
      pauseMovie();
    } else if (isPaused) {
      resumeMovie();
    } else {
      startMovie();
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background select-none">
      {/* ── Top Header Command Bar ── */}
      <header className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/40 bg-card/40 backdrop-blur-md z-10 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400 shadow-sm">
            <Layers3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm font-bold tracking-tight text-foreground truncate">
                Digital Twin
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                Carparking-01 B2
              </span>
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isRunning
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                    : isPaused
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-slate-700/40 text-slate-300 border border-slate-700"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              1472×1508 Operational Coordinate Space · 60 Canonical Bays
            </p>
          </div>
        </div>

        {/* Playback Controls & Action Strip */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Play / Pause / Resume Button */}
          <Button
            size="sm"
            onClick={handlePlayToggle}
            className={`h-8 gap-1.5 text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-transform active:scale-95 ${
              isRunning
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume</span>
              </>
            ) : isCompleted ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start</span>
              </>
            )}
          </Button>

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetBoth}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground hidden sm:flex"
            title="Reset Movie Simulation & Demo State"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </Button>

          {/* CCTV Evidence Viewer Modal Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => useCctvEvidenceModalStore.getState().openModal({ camera: "CAM-01" })}
            className="h-8 gap-1.5 text-xs font-mono font-semibold border-sky-500/40 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="hidden md:inline">CCTV Evidence Viewer</span>
            <span className="md:hidden">CCTV</span>
          </Button>

          {/* Speed Multipliers */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  speed === s
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Timeline Clock Pill */}
          <div className="px-2.5 py-1 rounded-lg border border-border/60 bg-background/60 text-xs font-mono font-medium text-muted-foreground shadow-sm">
            <span className="text-foreground font-bold">{formatTime(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </header>

      {/* ── Synchronized Cross-System Persona & Scenario Controller Strip ── */}
      <div className="shrink-0 px-4 py-1.5 border-b border-border/40 bg-card/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono z-10">
        {/* Persona Switcher */}
        <div className="flex items-center gap-1.5" data-testid="admin-persona-selector">
          <span className="text-[10px] uppercase font-bold text-sky-400 mr-1 flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            Persona:
          </span>
          <button
            type="button"
            onClick={() => handleSelectPersona("USER_A")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
              activePersona === "USER_A"
                ? "border-sky-500 bg-sky-950/60 text-sky-300 shadow-sm"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
            }`}
          >
            User A (SP-07)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPersona("USER_B")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
              activePersona === "USER_B"
                ? "border-amber-500 bg-amber-950/60 text-amber-300 shadow-sm"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
            }`}
          >
            User B
          </button>
          <button
            type="button"
            onClick={() => handleSelectPersona("GUEST")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
              activePersona === "GUEST"
                ? "border-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-sm"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
            }`}
          >
            Guest
          </button>
        </div>

        {/* Live Status Indicators & Scenario Actions */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-300">
            <strong className="text-white">{occCount}</strong> Occ ·{" "}
            <strong className="text-emerald-400">{availCount}</strong> Avail ·{" "}
            <strong className="text-sky-300">{desigCount}</strong> Desig
            {resCount > 0 && <span> · <strong className="text-amber-400">{resCount}</strong> Res</span>}
            {sharedViolation && <span> · <strong className="text-rose-400 font-bold">⚠ VIOLATION (SP-11)</strong></span>}
          </span>

          {/* Violation Toggle */}
          {sharedViolation ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={clearViolation}
              className="h-6 px-2 text-[10px] font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white"
            >
              Clear Violation
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={triggerViolation}
              className="h-6 px-2 text-[10px] font-mono font-bold border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-white flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Simulate Violation</span>
            </Button>
          )}

          {/* Reset Demo */}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleResetBoth}
            className="h-6 px-2.5 text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1 border border-slate-700/60"
            title="Reset Demo Baseline"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Demo</span>
          </Button>
        </div>
      </div>

      {/* ── Main Hero Workspace: ~75% Hero Facility Map + ~25% Operational Inspector ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Center / Hero Facility Viewport (~75%) */}
        <div className="flex-1 h-full min-w-0 p-2 sm:p-2.5 flex flex-col relative overflow-hidden">
          <DigitalTwinMap
            hideAdminControls={false}
            showAdminVehicles={true}
            showAdminRoutes={true}
            highlightSlotId={sharedSelectedSpaceId}
          />
        </div>

        {/* Right Contextual Operational Inspector Rail (~25%) */}
        <div className="w-80 lg:w-[360px] xl:w-[390px] shrink-0 h-full border-l border-border/40 p-2.5 sm:p-3 overflow-y-auto bg-card/25 backdrop-blur-sm scrollbar-thin">
          <TwinIntelligenceRail />
        </div>
      </div>

      {/* ── Bottom Compact Status Strip ── */}
      <footer className="shrink-0 px-3.5 py-1.5 border-t border-border/40 bg-card/60 backdrop-blur-md z-10">
        <DigitalTwinStatusBar />
      </footer>
    </div>
  );
}
