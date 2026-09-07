"use client";

import React from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StartProjectButton() {
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

  const handleToggle = () => {
    if (isRunning) {
      pauseMovie();
    } else if (isPaused) {
      resumeMovie();
    } else if (isCompleted) {
      resetMovie();
      setTimeout(() => startMovie(), 100);
    } else {
      startMovie();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Prominent START PROJECT / PAUSE / RESUME Button */}
      <Button
        size="sm"
        onClick={handleToggle}
        className={`h-9 px-4 gap-2 font-mono text-xs font-bold uppercase tracking-wider shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
          isRunning
            ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30"
            : isPaused
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
            : isCompleted
            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30"
            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 animate-pulse"
        }`}
      >
        {isRunning ? (
          <>
            <Pause className="h-4 w-4 fill-current" />
            <span>Pause Project</span>
          </>
        ) : isPaused ? (
          <>
            <Play className="h-4 w-4 fill-current" />
            <span>Resume Project</span>
          </>
        ) : isCompleted ? (
          <>
            <RotateCcw className="h-4 w-4" />
            <span>Restart Project</span>
          </>
        ) : (
          <>
            <Play className="h-4 w-4 fill-current" />
            <span>Start Project</span>
          </>
        )}
      </Button>

      {/* Clock & Speed Pill */}
      {(isRunning || isPaused || currentTime > 0) && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 bg-muted/40 text-xs font-mono">
          <span className="text-foreground font-bold">{formatTime(currentTime)}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{formatTime(totalDuration)}</span>

          {/* Speed Toggle Buttons */}
          <div className="ml-1 flex items-center gap-0.5 border-l border-border/60 pl-1.5">
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  speed === s
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
