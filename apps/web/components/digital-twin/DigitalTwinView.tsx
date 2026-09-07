"use client";

import React from "react";
import { Layers3, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { TwinKPIs } from "./TwinKPIs";
import { FacilityMap } from "./FacilityMap";
import { TwinIntelligenceRail } from "./TwinIntelligenceRail";

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
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── Header Ribbon & Movie Controls ── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400 shadow-lg shadow-sky-500/10">
            <Layers3 className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Digital Twin
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                L-Shaped Facility B2
              </span>
              <span
                className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
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
            <p className="text-xs text-muted-foreground mt-0.5">
              Authoritative real-time virtual replica · 1472×1508 Canonical Floor Plan
            </p>
          </div>
        </div>

        {/* Playback Controls Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Play / Pause / Resume Button */}
          <Button
            size="sm"
            onClick={handlePlayToggle}
            className={`gap-1.5 text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-transform active:scale-95 ${
              isRunning
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause Movie</span>
              </>
            ) : isPaused ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume Movie</span>
              </>
            ) : isCompleted ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart Movie</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start Movie</span>
              </>
            )}
          </Button>

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetMovie}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Movie</span>
          </Button>

          {/* Speed Multipliers */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
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
          <div className="px-3 py-1.5 rounded-lg border border-border/60 bg-background/60 text-xs font-mono font-medium text-muted-foreground shadow-sm">
            <span className="text-foreground font-bold">{formatTime(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
      </header>

      {/* ── KPIs Metric Bar (Reading from Shared Movie Store) ── */}
      <TwinKPIs />

      {/* ── Main Workspace: 2D Interactive Facility Map & Intelligence Rail ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left 3 Columns: Facility Map */}
        <div className="lg:col-span-3 space-y-4">
          <FacilityMap />
        </div>

        {/* Right 1 Column: Intelligence Rail */}
        <div className="lg:col-span-1">
          <TwinIntelligenceRail />
        </div>
      </div>
    </div>
  );
}
