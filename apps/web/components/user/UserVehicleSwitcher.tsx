"use client";

import React from "react";
import { Car, CheckCircle2, UserCheck, Users, HelpCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_VEHICLES, DEMO_VEHICLE_IDS } from "@/config/demoVehicles";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { bayLabel } from "@/utils/bayLabel";

/**
 * UserVehicleSwitcher:
 * Supports both the 3 Canonical Demo Personas (User A, User B, Guest)
 * and the individual vehicle profiles for drivers.
 */
export function UserVehicleSwitcher() {
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const selectVehicle = useUserPortalStore((s) => s.selectVehicle);
  const journeys = useUserPortalStore((s) => s.journeys);

  const activePersona = useSharedDemoState((s) => s.activePersona);
  const setActivePersona = useSharedDemoState((s) => s.setActivePersona);
  const sharedViolation = useSharedDemoState((s) => s.violation);
  const triggerViolation = useSharedDemoState((s) => s.triggerViolation);
  const clearViolation = useSharedDemoState((s) => s.clearViolation);
  const resetAll = useSharedDemoState((s) => s.resetAll);
  const sharedSpaces = useSharedDemoState((s) => s.spaces);

  const spacesList = Object.values(sharedSpaces);
  const occCount = spacesList.filter((s) => s.status === "OCCUPIED" || s.status === "VIOLATION").length;
  const availCount = spacesList.filter((s) => s.status === "AVAILABLE").length;
  const desigCount = spacesList.filter((s) => s.status === "DESIGNATED").length;
  const resCount = spacesList.filter((s) => s.status === "RESERVED").length;

  const handleSelectPersona = (persona: "USER_A" | "USER_B" | "GUEST") => {
    setActivePersona(persona);
    if (persona === "USER_A") {
      selectVehicle("VEH-001");
    } else if (persona === "USER_B") {
      selectVehicle("VEH-002");
    } else {
      selectVehicle("VEH-003");
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 3 Canonical Demo Personas (Prompt Section 5, 6, 7) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-sky-400" />
            Select Demo Persona
          </span>
          <span className="text-[11px] text-slate-500">Cross-Tab Synchronized</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" data-testid="user-persona-selector">
          {/* USER A */}
          <button
            type="button"
            onClick={() => handleSelectPersona("USER_A")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePersona === "USER_A"
                ? "border-sky-500 bg-sky-950/40 ring-1 ring-sky-500/50 shadow-lg"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono font-bold text-xs text-sky-300 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-sky-400" />
                USER A (Registered)
              </span>
              <span className="h-2 w-2 rounded-full bg-sky-400" />
            </div>
            <div className="text-[11px] text-slate-300 font-sans mt-1">
              Active Reservation · <strong className="text-sky-300 font-mono">SP-07</strong>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] font-mono text-sky-400 font-semibold flex items-center gap-1">
              ★ Designated Space Ready
            </div>
          </button>

          {/* USER B */}
          <button
            type="button"
            onClick={() => handleSelectPersona("USER_B")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePersona === "USER_B"
                ? "border-amber-500 bg-amber-950/40 ring-1 ring-amber-500/50 shadow-lg"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono font-bold text-xs text-amber-300 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                USER B (Registered)
              </span>
              <span className="h-2 w-2 rounded-full bg-amber-400" />
            </div>
            <div className="text-[11px] text-slate-300 font-sans mt-1">
              Valid Eligibility · <span className="text-slate-400">No Pre-Designation</span>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] font-mono text-amber-400 font-semibold flex items-center gap-1">
              Select & Reserve Bay
            </div>
          </button>

          {/* GUEST */}
          <button
            type="button"
            onClick={() => handleSelectPersona("GUEST")}
            className={`p-3 rounded-xl border text-left transition-all ${
              activePersona === "GUEST"
                ? "border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/50 shadow-lg"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono font-bold text-xs text-emerald-300 flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                GUEST USER
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-300 font-sans mt-1">
              Unregistered · <span className="text-slate-400">No Prior Allocation</span>
            </div>
            <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
              Check Live Availability
            </div>
          </button>
        </div>

        {/* ── Demo Scenario Controls (Authoritative Persona & Violation Simulator) ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl border border-sky-500/30 bg-slate-900/80 backdrop-blur-md shadow-lg text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              DEMO STATUS:
            </span>
            <span className="text-[11px] text-slate-300">
              <strong className="text-white">{occCount}</strong> Occ · <strong className="text-emerald-400">{availCount}</strong> Avail · <strong className="text-sky-300">{desigCount}</strong> Desig
              {resCount > 0 && <span> · <strong className="text-amber-400">{resCount}</strong> Res</span>}
              {sharedViolation && (
                <span>
                  {" "}·{" "}
                  <strong className="text-rose-400 font-bold">
                    {sharedViolation.adminAlertActive ? "⚠ VIOLATION (SP-11)" : "⚠ WRONG SPACE (SP-11)"}
                  </strong>
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {sharedViolation ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={clearViolation}
                className="h-7 text-[10px] font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Clear Violation
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={triggerViolation}
                className="h-7 text-[10px] font-mono font-bold border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:text-white flex items-center gap-1 shadow-sm"
                title="Simulate VEH-001 parking in unauthorized SP-11 (driver warned, 10m policy)"
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Simulate Wrong Space (SP-11)</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => resetAll()}
              className="h-7 px-3 text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1 border border-slate-700/60"
              title="Reset Demo Baseline (15 Occ / 4 Avail / 1 Desig)"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Demo</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Secondary Driver Vehicle Profiles ── */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Car className="h-3.5 w-3.5 text-slate-400" />
            Active Driver Vehicles
          </span>
          <span className="text-[11px] text-slate-500">5 active driver profiles</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {DEMO_VEHICLE_IDS.map((vehId) => {
            const def = DEMO_VEHICLES[vehId];
            if (!def) return null;
            const journey = journeys[vehId];
            const isSelected = activeVehicleId === vehId;
            const isParked = journey?.journeyStep === "PARKED" || journey?.journeyStep === "PARKING_SESSION";
            const hasRes = def.scenario.hasReservation;
            const targetSlot = journey?.assignedSpaceId || def.scenario.assignedSpaceId || (vehId === "VEH-001" ? "SP-07" : "");

            return (
              <button
                key={vehId}
              type="button"
              onClick={() => selectVehicle(vehId)}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-sky-500 bg-sky-500/15 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/40"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono font-bold text-xs text-white tracking-tight">
                  {vehId}
                </span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: def.scenario.color }}
                  title={def.scenario.color}
                />
              </div>

              <span className="text-[11px] text-slate-400 truncate max-w-full font-sans mt-0.5">
                {def.scenario.model}
              </span>

              <div className="mt-2 w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                {isParked ? (
                  <span className="text-[10px] font-mono font-semibold text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Parked ({bayLabel(targetSlot)})
                  </span>
                ) : hasRes ? (
                  <span className="text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Res: {bayLabel(targetSlot)}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    Drive-in
                  </span>
                )}

                {isSelected && (
                  <CheckCircle2 className="h-3 w-3 text-sky-400 shrink-0 ml-1" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
  );
}
