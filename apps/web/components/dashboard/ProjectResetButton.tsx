"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { resetDigitalTwinState } from "@/services/parking";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { useJourneyStationStore } from "@/store/useJourneyStationStore";
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

interface ProjectResetButtonProps {
  variant?: "destructive" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ProjectResetButton({
  variant = "destructive",
  size = "sm",
  className,
}: ProjectResetButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const resetDigitalTwin = useDigitalTwinStore((state) => state.resetDigitalTwin);
  const clearStationFeeds = useJourneyStationStore((state) => state.clearAll);
  const clearAllJobs = useGlobalProcessingStore((state) => state.clearAllJobs);

  const handleOpenModal = () => {
    setResetSuccess(false);
    setErrorMessage(null);
    setIsOpen(true);
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    setErrorMessage(null);
    try {
      // 1. Authoritative Backend System Reset via POST /api/v1/parking/reset
      await resetDigitalTwinState();

      // 2. Authoritative Shared Demo Movie Global Reset
      useDemoMovieStore.getState().resetMovie();

      // 3. Clear client-side stores
      resetDigitalTwin();
      clearStationFeeds();
      clearAllJobs();

      // 4. Invalidate and clear all TanStack Query caches
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ["parking"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      await queryClient.invalidateQueries({ queryKey: ["cameras"] });
      await queryClient.invalidateQueries({ queryKey: ["journeys"] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });

      setResetSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setResetSuccess(false);
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset request failed";
      setErrorMessage(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenModal}
        className={`gap-1.5 font-mono text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
          variant === "destructive"
            ? "bg-red-600/90 hover:bg-red-600 text-white shadow-red-900/20"
            : "border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500"
        } ${className || ""}`}
        title="Authoritative full-system project reset"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Project Reset</span>
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!isResetting) setIsOpen(open);
        }}
        title="Authoritative Facility Project Reset"
        description="Execute a full canonical reset of the ParkTwin operating state across database and telemetry layers."
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteReset}
              disabled={isResetting || resetSuccess}
              className="gap-1.5 font-mono uppercase text-xs bg-red-600 hover:bg-red-700"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Resetting State...</span>
                </>
              ) : resetSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Reset Complete</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Execute Reset</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2 text-xs">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">
                  Real System Operation (POST /api/v1/parking/reset)
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  This is not a local frontend toggle. The backend will actively purge runtime sessions, release all 10 slots to FREE, wipe active correlate tracking, and broadcast a global state flush via WebSocket.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-card/60 p-3 space-y-2">
            <p className="font-mono font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
              What will be reset:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>All 10 active runtime slots (P01–P10) reverted to <span className="text-emerald-400 font-mono">available</span>.</li>
              <li>Active vehicle parking sessions closed & archived in database.</li>
              <li>Replay and ANPR correlates cleared from memory.</li>
              <li>Frontend Zustand stores, upload stations, and React Query caches flushed.</li>
            </ul>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2.5 text-destructive text-xs">
              {errorMessage}
            </div>
          )}

          {resetSuccess && (
            <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-2.5 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Facility state successfully reset to baseline.</span>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
