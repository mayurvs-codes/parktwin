"use client";

import React from "react";
import { LogOut, CheckCircle2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPortalStore } from "@/store/useUserPortalStore";

interface UserExitHUDProps {
  onExitConfirm?: () => void;
}

/**
 * UserExitHUD:
 * Simple overlay for Exit Navigation:
 * SP-07 -> -> -> 🚪 EXIT
 * Only displays current exit guidance and confirm exit trigger.
 */
export function UserExitHUD({ onExitConfirm }: UserExitHUDProps) {
  const currentRoute = useUserPortalStore((s) => s.currentRoute);
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId) || "SP-07";
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const advanceNavigationStep = useUserPortalStore((s) => s.advanceNavigationStep);
  const reachGateway = useUserPortalStore((s) => s.reachGateway);
  const confirmExit = useUserPortalStore((s) => s.confirmExit);

  const distance = currentRoute?.distanceRemainingMeters ?? 74;

  const handleConfirmExit = () => {
    confirmExit();
    onExitConfirm?.();
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
      <div className="pointer-events-auto flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-amber-500/40 bg-slate-950/95 px-5 py-4 backdrop-blur-xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <LogOut className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              {assignedSpaceId} → 🚪 EXIT GATEWAY
            </div>
            <div className="text-lg font-black text-white font-mono">
              {distance} m to exit
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={advanceNavigationStep}
            className="text-xs font-mono border-slate-700 text-slate-300 hover:text-white h-9"
          >
            Step
          </Button>

          {journeyStep === "AT_GATEWAY" ? (
            <Button
              onClick={handleConfirmExit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs px-4 h-9 gap-1.5 shadow-lg shadow-emerald-950"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>CONFIRM EXIT</span>
            </Button>
          ) : (
            <Button
              onClick={reachGateway}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-xs px-4 h-9 gap-1.5 shadow-lg shadow-amber-950"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>REACH GATEWAY</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
