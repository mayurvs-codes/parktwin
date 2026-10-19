"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPortalStore } from "@/store/useUserPortalStore";

interface UserParkingCardProps {
  onNavigateToExit?: () => void;
}

/**
 * UserParkingCard:
 * Simple, action-oriented card displayed when the vehicle is parked.
 * Shows spot, zone, level, duration, and big "NAVIGATE TO EXIT" CTA.
 */
export function UserParkingCard({ onNavigateToExit }: UserParkingCardProps) {
  const router = useRouter();
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId) || (activeVehicleId === "VEH-001" ? "SP-07" : null);
  const assignedSpace = useUserPortalStore((s) => s.assignedSpace);
  const activeSession = useUserPortalStore((s) => s.activeSession);
  const sessionDurationSeconds = useUserPortalStore((s) => s.sessionDurationSeconds);
  const sessionTimerRunning = useUserPortalStore((s) => s.sessionTimerRunning);
  const requestExit = useUserPortalStore((s) => s.requestExit);

  // Re-render tick every second to keep live duration counter fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!sessionTimerRunning) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [sessionTimerRunning]);

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

  const handleExitClick = () => {
    requestExit();
    if (onNavigateToExit) {
      onNavigateToExit();
    } else {
      router.push("/user/navigation");
    }
  };

  const zone = assignedSpace?.zone || vehicleDef.scenario.zone || "Zone B (Upper Island)";

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/30 p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            MY PARKING
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
              🅿️ {assignedSpaceId}
            </span>
          </div>
        </div>

        <div className="text-right space-y-0.5">
          <span className="text-xs font-mono font-semibold text-slate-300 block">
            {zone}
          </span>
          <span className="text-[11px] font-mono text-slate-400 block">
            Level B2
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono mb-1">
            <Car className="h-3.5 w-3.5 text-sky-400" />
            <span>VEHICLE</span>
          </div>
          <span className="font-mono font-bold text-sm text-white">
            {activeVehicleId}
          </span>
          <span className="text-[11px] text-slate-400 block truncate">
            {vehicleDef.scenario.model}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-mono mb-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>DURATION</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ● PARKED
            </span>
          </div>
          <span className="font-mono font-bold text-sm text-emerald-300">
            {formatDuration(liveDurationSecs)}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Active session
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          onClick={handleExitClick}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-sm h-12 shadow-lg shadow-amber-950/60 gap-2"
        >
          <Navigation className="h-4 w-4" />
          <span>NAVIGATE TO EXIT</span>
        </Button>

        <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1 pt-1">
          <Link href="/user/parking/session" className="hover:text-slate-200 transition-colors">
            View Session Details →
          </Link>
          <Link href="/user/navigation" className="text-sky-400 hover:text-sky-300 transition-colors">
            Open Map View →
          </Link>
        </div>
      </div>
    </div>
  );
}
