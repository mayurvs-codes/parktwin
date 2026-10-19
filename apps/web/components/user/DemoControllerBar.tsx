"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  Car,
  StepForward,
  Play,
  Pause,
  Cctv,
  Layers,
  FastForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useUserPortalStore,
  type VehicleJourneyStep,
} from "@/store/useUserPortalStore";
import { DEMO_VEHICLE_IDS } from "@/config/demoVehicles";
import { evidenceReplayController } from "@/services/evidence/evidenceReplayController";

const STEP_LABELS: Record<VehicleJourneyStep, string> = {
  NOT_SEEN: "Not Seen",
  ENTRY_DETECTED: "1. Entry Detected",
  VEHICLE_IDENTIFIED: "2. Vehicle Identified",
  RESERVATION_CHECK: "3. Reservation Check",
  SPACE_ASSIGNED: "4. Space Assigned",
  NAVIGATING_TO_SPACE: "5. Navigating to Bay",
  PARKED: "6. Parked Successfully",
  PARKING_SESSION: "7. Active Parking Session",
  EXIT_REQUESTED: "8. Exit Requested",
  NAVIGATING_TO_EXIT: "9. Navigating to Exit",
  AT_GATEWAY: "10. At Gateway",
  EXIT_CONFIRMED: "11. Exit Confirmed",
  SESSION_COMPLETE: "12. Session Complete",
};

/**
 * DemoControllerBar: Dual-mode Controller supporting both:
 *  1. DEMO MODE: Manual deterministic stepping, vehicle switching, and reset
 *  2. EVIDENCE MODE: Real CCTV/ANPR pipeline timeline replay and evidence inspection
 */
export function DemoControllerBar() {
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const executionMode = useUserPortalStore((s) => s.executionMode);
  const evidenceStepIndex = useUserPortalStore((s) => s.evidenceStepIndex);

  const selectVehicle = useUserPortalStore((s) => s.selectVehicle);
  const setExecutionMode = useUserPortalStore((s) => s.setExecutionMode);
  const stepNextEvent = useUserPortalStore((s) => s.stepNextEvent);
  const resetJourney = useUserPortalStore((s) => s.resetJourney);
  const resetDemo = useUserPortalStore((s) => s.resetDemo);
  const stepEvidenceReplay = useUserPortalStore((s) => s.stepEvidenceReplay);
  const resetEvidenceReplay = useUserPortalStore((s) => s.resetEvidenceReplay);

  const [isPlayingEvidence, setIsPlayingEvidence] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);

  const handleTogglePlayEvidence = () => {
    if (isPlayingEvidence) {
      evidenceReplayController.pause();
      setIsPlayingEvidence(false);
    } else {
      evidenceReplayController.setSpeed(replaySpeed);
      evidenceReplayController.play();
      setIsPlayingEvidence(true);
      // Periodic check or subscription
      const unsub = evidenceReplayController.subscribe(() => {
        if (evidenceReplayController.getStatus() === "COMPLETED") {
          setIsPlayingEvidence(false);
          unsub();
        }
      });
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = replaySpeed === 1 ? 2 : replaySpeed === 2 ? 4 : 1;
    setReplaySpeed(nextSpeed);
    evidenceReplayController.setSpeed(nextSpeed);
  };

  const isEvidenceMode = executionMode === "EVIDENCE";
  const evidence = vehicleDef.evidence;

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-950/90 p-2.5 sm:p-3 backdrop-blur-md shadow-lg flex flex-col gap-2.5 text-xs">
      {/* Top Ribbon: Mode Toggle & Active Evidence Grounding Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setExecutionMode("DEMO");
              if (isPlayingEvidence) {
                evidenceReplayController.pause();
                setIsPlayingEvidence(false);
              }
            }}
            className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold tracking-wider transition-colors flex items-center gap-1.5 ${
              !isEvidenceMode
                ? "bg-sky-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>DEMO MODE</span>
          </button>

          <button
            type="button"
            onClick={() => setExecutionMode("EVIDENCE")}
            className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold tracking-wider transition-colors flex items-center gap-1.5 ${
              isEvidenceMode
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cctv className="h-3 w-3 text-purple-300" />
            <span>EVIDENCE MODE</span>
          </button>
        </div>

        {/* Evidence Status Pill */}
        <div className="flex items-center gap-2">
          {evidence.plate ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-white">{evidence.plate}</strong>
              <span className="text-emerald-500/80">({((evidence.plateConfidence ?? 0) * 100).toFixed(0)}% {evidence.ocrEngine})</span>
              <span className="text-slate-500 text-[10px]">Track #{evidence.trackId}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-950/40 px-2 py-0.5 font-mono text-[11px] text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Pending Real ANPR Link</span>
              <span className="text-slate-500 text-[10px]">Track #{evidence.trackId}</span>
            </span>
          )}

          <span
            suppressHydrationWarning
            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-400 flex items-center gap-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            {isEvidenceMode
              ? (evidenceStepIndex >= 0 ? `Evidence Step ${evidenceStepIndex + 1}` : "Timeline Ready")
              : STEP_LABELS[journeyStep]}
          </span>
        </div>
      </div>

      {/* Bottom Controls: Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Vehicle Quick Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Car className="h-3.5 w-3.5 text-sky-400" />
            Vehicle:
          </span>
          {DEMO_VEHICLE_IDS.map((vid) => {
            const isSelected = vid === activeVehicleId;
            const isReserved = vid === "VEH-001" || vid === "VEH-002";
            return (
              <button
                key={vid}
                type="button"
                onClick={() => selectVehicle(vid)}
                className={`px-2 py-1 rounded-md font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? isEvidenceMode
                      ? "bg-purple-600 text-white shadow-md font-bold"
                      : "bg-sky-500 text-slate-950 shadow-md font-bold"
                    : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                }`}
              >
                <span>{vid}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isReserved ? "bg-amber-400" : "bg-slate-400"
                  }`}
                  title={isReserved ? "Reserved" : "No Reservation"}
                />
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {isEvidenceMode ? (
            <>
              {/* Evidence Mode Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePlayEvidence}
                className="h-7 text-xs font-mono gap-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
                title="Play/Pause real CCTV evidence replay"
              >
                {isPlayingEvidence ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause Replay</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Play Evidence</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => stepEvidenceReplay()}
                className="h-7 text-xs font-mono gap-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                title="Advance to next CCTV evidence frame"
              >
                <StepForward className="h-3.5 w-3.5" />
                <span>Next Evidence</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={cycleSpeed}
                className="h-7 text-xs font-mono gap-1 text-slate-300 hover:bg-slate-800"
                title="Change replay speed"
              >
                <FastForward className="h-3 w-3 text-purple-400" />
                <span>{replaySpeed}x</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPlayingEvidence(false);
                  resetEvidenceReplay();
                }}
                className="h-7 text-xs font-mono gap-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                title="Reset evidence replay"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Evidence</span>
              </Button>
            </>
          ) : (
            <>
              {/* Demo Mode Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={stepNextEvent}
                className="h-7 text-xs font-mono gap-1 border-sky-500/30 text-sky-300 hover:bg-sky-500/20"
                title="Advance to next deterministic step"
              >
                <StepForward className="h-3.5 w-3.5" />
                <span>Next Event</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={resetJourney}
                className="h-7 text-xs font-mono gap-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                title="Reset this vehicle to entry state"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Vehicle</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={resetDemo}
                className="h-7 text-xs font-mono gap-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                title="Reset all vehicles and spaces to initial scenario state"
              >
                <span>Reset Demo</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
