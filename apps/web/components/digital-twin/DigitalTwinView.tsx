"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { Layers3, RotateCcw, Box, Grid2x2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { DigitalTwinMap } from "@/components/user/DigitalTwinMap";
import { TwinIntelligenceRail } from "./TwinIntelligenceRail";
import { DigitalTwinStatusBar } from "./DigitalTwinStatusBar";
import { Twin3DErrorBoundary } from "./Twin3DErrorBoundary";
import { useDigitalTwinSocket } from "@/hooks/useDigitalTwinSocket";
import { bayLabel } from "@/utils/bayLabel";

const UnifiedTwinCanvas3D = dynamic(
  () => import("./UnifiedTwinCanvas3D").then((m) => m.UnifiedTwinCanvas3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[460px] rounded-xl border border-slate-800 bg-[#050811] flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Initializing 3D Digital Twin...
        </span>
      </div>
    ),
  }
);

export default function DigitalTwinView() {
  useDigitalTwinSocket();
  const resetMovie = useDemoMovieStore((s) => s.resetMovie);
  const hydrateFromStorage = useDemoMovieStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Shared Cross-System Demo State
  const sharedSelectedSpaceId = useSharedDemoState((s) => s.selectedSpaceId);
  const selectSharedSpace = useSharedDemoState((s) => s.selectSpace);
  const sharedSpaces = useSharedDemoState((s) => s.spaces);
  const sharedViolation = useSharedDemoState((s) => s.violation);
  const clearViolation = useSharedDemoState((s) => s.clearViolation);
  const resetAllShared = useSharedDemoState((s) => s.resetAll);

  // 2D / 3D View Mode State
  const viewMode = useDigitalTwinStore((s) => s.viewMode);
  const setViewMode = useDigitalTwinStore((s) => s.setViewMode);

  // User Portal Driver State
  const resetUserDemo = useUserPortalStore((s) => s.resetDemo);

  const spacesList = Object.values(sharedSpaces);
  const occCount = spacesList.filter((s) => s.status === "OCCUPIED" || s.status === "VIOLATION").length;
  const availCount = spacesList.filter((s) => s.status === "AVAILABLE").length;
  const desigCount = spacesList.filter((s) => s.status === "DESIGNATED").length;
  const resCount = spacesList.filter((s) => s.status === "RESERVED").length;

  const handleResetBoth = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Are you sure you want to reset all Digital Twin and parking session states?");
      if (!confirmed) return;
    }
    resetAllShared();
    resetUserDemo();
    resetMovie();
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
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              B2 facility · 60 bays
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* 2D Vector / 3D Twin View Switcher */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5" data-testid="twin-view-mode-selector">
            <button
              type="button"
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                viewMode === "2d"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid2x2 className="h-3 w-3" />
              <span>2D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                viewMode === "3d"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Box className="h-3 w-3" />
              <span>3D</span>
            </button>
          </div>

        </div>
      </header>

      {/* ── Synchronized Cross-System Persona & Scenario Controller Strip ── */}
      <div className="shrink-0 px-4 py-1.5 border-b border-border/40 bg-card/60 backdrop-blur-md flex flex-wrap items-center justify-end gap-2.5 text-xs font-mono z-10">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-300">
            <strong className="text-white">{occCount}</strong> Occ ·{" "}
            <strong className="text-emerald-400">{availCount}</strong> Avail ·{" "}
            <strong className="text-sky-300">{desigCount}</strong> Desig
            {resCount > 0 && <span> · <strong className="text-amber-400">{resCount}</strong> Res</span>}
            {sharedViolation && <span> · <strong className="text-rose-400 font-bold">⚠ VIOLATION ({bayLabel(sharedViolation.actualSpaceId)})</strong></span>}
          </span>

          {sharedViolation && (
            <Button
              size="sm"
              variant="destructive"
              onClick={clearViolation}
              className="h-6 px-2 text-[10px] font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white"
            >
              Clear Violation
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
          {viewMode === "3d" ? (
            <Twin3DErrorBoundary
              fallback2D={
                <DigitalTwinMap
                  hideAdminControls={false}
                  showAdminVehicles={true}
                  showAdminRoutes={true}
                  highlightSlotId={sharedSelectedSpaceId}
                />
              }
            >
              <UnifiedTwinCanvas3D
                highlightSlotId={sharedSelectedSpaceId}
                onSlotSelect={(slotId) => selectSharedSpace(slotId)}
              />
            </Twin3DErrorBoundary>
          ) : (
            <DigitalTwinMap
              hideAdminControls={false}
              showAdminVehicles={true}
              showAdminRoutes={true}
              highlightSlotId={sharedSelectedSpaceId}
            />
          )}
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
