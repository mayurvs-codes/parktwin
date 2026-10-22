"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Navigation,
  Search,
  Compass,
  ParkingSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { UserParkingCard } from "./UserParkingCard";
import { bayLabel } from "@/utils/bayLabel";

/**
 * UserHome:
 * Primary hero card for /user/dashboard.
 * Immediately displays:
 * 1. YOUR VEHICLE & PERSONA (USER A, USER B, GUEST)
 * 2. Status (DESIGNATED / RESERVED / FIND PARKING / PARKED)
 * 3. Space ID or available count in the Focused Demo Zone
 * 4. Action button (START NAVIGATION / FIND PARKING / NAVIGATE TO EXIT)
 */
export function UserHome() {
  const router = useRouter();
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const startNavigation = useUserPortalStore((s) => s.startNavigation);
  const assignSpace = useUserPortalStore((s) => s.assignSpace);

  // Authoritative Shared Demo Zone State
  const activePersona = useSharedDemoState((s) => s.activePersona);
  const focusedSpaces = useSharedDemoState((s) => s.spaces);

  // Calculate live available count in focused zone
  const availableFocused = Object.values(focusedSpaces).filter((s) => s.status === "AVAILABLE");
  const availableCount = availableFocused.length;

  // Check if User B has a confirmed reservation
  const userBReservation = Object.values(focusedSpaces).find(
    (s) => s.status === "RESERVED" && s.user === "Registered User B"
  );

  // Determine active assigned/designated space
  let designatedSpaceId: string | null = null;
  let isDesignatedUser = false;
  let isReservedUser = false;

  if (activePersona === "USER_A") {
    designatedSpaceId = "SP-07";
    isDesignatedUser = true;
  } else if (activePersona === "USER_B" && userBReservation) {
    designatedSpaceId = userBReservation.id;
    isReservedUser = true;
  }

  const isParked = journeyStep === "PARKED" || journeyStep === "PARKING_SESSION";
  const isNavigatingToSpace = journeyStep === "NAVIGATING_TO_SPACE";
  const isNavigatingToExit = journeyStep === "NAVIGATING_TO_EXIT" || journeyStep === "AT_GATEWAY";

  // If vehicle is actively parked, show dedicated My Parking card
  if (isParked) {
    return <UserParkingCard onNavigateToExit={() => router.push("/user/navigation")} />;
  }

  const handleStartNav = (targetSlot: string) => {
    assignSpace(targetSlot);
    startNavigation();
    router.push("/user/navigation");
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-sky-400 font-bold">
            PARKTWIN AI
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300">
            FOCUSED ZONE (ISLAND 1)
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <ParkingSquare className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-bold text-emerald-400">{availableCount}</span>
          <span>spaces available</span>
        </div>
      </div>

      {/* Main Vehicle & Persona Details */}
      <div className="space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
              {activePersona === "GUEST" ? "GUEST VISITOR" : "REGISTERED DRIVER"}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                {activeVehicleId}
              </h2>
              <span className="text-sm text-slate-400 font-sans">
                ({vehicleDef.scenario.model})
              </span>
            </div>
          </div>

          {/* Persona Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold">
            {activePersona === "USER_A" && (
              <span className="text-sky-400 border-sky-500/30 bg-sky-950/40 px-2 py-0.5 rounded-full">
                ★ USER A · DESIGNATED
              </span>
            )}
            {activePersona === "USER_B" && (
              <span className="text-amber-400 border-amber-500/30 bg-amber-950/40 px-2 py-0.5 rounded-full">
                ● USER B · {userBReservation ? "RESERVED" : "ELIGIBLE"}
              </span>
            )}
            {activePersona === "GUEST" && (
              <span className="text-slate-300 border-slate-700 bg-slate-800/60 px-2 py-0.5 rounded-full">
                ○ GUEST ACCESS
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Status Presentation */}
        {isDesignatedUser ? (
          <div className="p-4 sm:p-5 rounded-xl border border-sky-500/40 bg-sky-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-mono font-bold text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
                <span>★ DESIGNATED PARKING READY</span>
              </div>
              <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                NO SEARCHING REQUIRED
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
              {bayLabel("SP-07")}
            </div>
            <p className="text-xs text-sky-200/80 font-mono font-medium">
              Your designated parking space is <strong>{bayLabel("SP-07")}</strong> (Zone A · North Concourse · Level B2).
            </p>
          </div>
        ) : isReservedUser && designatedSpaceId ? (
          <div className="p-4 sm:p-5 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>RESERVED SPACE</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  ACTIVE RESERVATION
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700">
                  NO DESIGNATED SPACE
                </span>
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
              {designatedSpaceId}
            </div>
            <p className="text-xs text-amber-200/80 font-mono font-medium">
              Space <strong>{designatedSpaceId}</strong> is reserved for Registered User B. Direct navigation ready.
            </p>
          </div>
        ) : activePersona === "USER_B" ? (
          <div className="p-4 sm:p-5 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span>🔵 NO DESIGNATED SPACE</span>
              </div>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                VALID ELIGIBILITY
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {availableCount} spaces available
            </div>
            <span className="text-xs text-slate-300 font-mono block">
              Registered driver verified. Please select and reserve an available bay in the Demo Zone.
            </span>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-mono font-bold text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>⚪ GUEST ACCESS</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                REAL-TIME MONITORING
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {availableCount} spaces available
            </div>
            <span className="text-xs text-slate-400 font-mono block">
              Unregistered visitor access. Check real-time space availability before entering.
            </span>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div>
        {isNavigatingToSpace ? (
          <Link href="/user/navigation" className="block w-full">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-sm h-12 shadow-lg shadow-emerald-950 gap-2">
              <Compass className="h-4 w-4 animate-spin" />
              <span>CONTINUE NAVIGATION</span>
            </Button>
          </Link>
        ) : isNavigatingToExit ? (
          <Link href="/user/navigation" className="block w-full">
            <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-sm h-12 shadow-lg shadow-amber-950 gap-2">
              <Navigation className="h-4 w-4" />
              <span>NAVIGATE TO EXIT</span>
            </Button>
          </Link>
        ) : isDesignatedUser ? (
          <Button
            onClick={() => handleStartNav("SP-07")}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-sm h-12 shadow-lg shadow-sky-950 gap-2"
          >
            <Navigation className="h-4 w-4" />
            <span>START NAVIGATION TO {bayLabel("SP-07")}</span>
          </Button>
        ) : isReservedUser && designatedSpaceId ? (
          <Button
            onClick={() => handleStartNav(designatedSpaceId!)}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-sm h-12 shadow-lg shadow-amber-950 gap-2"
          >
            <Navigation className="h-4 w-4" />
            <span>START NAVIGATION TO {designatedSpaceId}</span>
          </Button>
        ) : (
          <Link href="/user/parking/find" className="block w-full">
            <Button className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-sm h-12 shadow-lg shadow-sky-950 gap-2">
              <Search className="h-4 w-4" />
              <span>
                {activePersona === "USER_B" ? "FIND & RESERVE PARKING" : "CHECK LIVE AVAILABILITY"}
              </span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
