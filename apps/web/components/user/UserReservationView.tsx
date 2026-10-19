"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Navigation,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";

export function UserReservationView() {
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);
  const rawAssignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId);
  const startNavigation = useUserPortalStore((s) => s.startNavigation);
  const activePersona = useSharedDemoState((s) => s.activePersona);
  const focusedSpaces = useSharedDemoState((s) => s.spaces);

  const isUserA = activePersona === "USER_A" || activeVehicleId === "VEH-001";
  const userBReservation = Object.values(focusedSpaces).find(
    (s) => s.status === "RESERVED" && s.user === "Registered User B"
  );

  const assignedSpaceId =
    rawAssignedSpaceId || (isUserA ? "SP-07" : userBReservation?.id || null);

  const hasReservation = isUserA || Boolean(userBReservation) || vehicleDef.scenario.hasReservation;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            {isUserA ? "Designated Parking Allocation" : "Reservation Experience"}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
          {isUserA
            ? "DESIGNATED SPACE ALLOCATED"
            : hasReservation
            ? "RESERVATION FOUND"
            : "NO RESERVATION FOUND"}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {isUserA
            ? "Your designated parking space is ready and guaranteed. Direct navigation is active."
            : hasReservation
            ? "Your reserved parking space is waiting for you. No space searching required."
            : "No active reservation is on record for this vehicle. Drive-in parking is available."}
        </p>
      </div>

      {hasReservation ? (
        /* ── State A: Designated / Reserved Vehicle ── */
        <div className="space-y-6">
          <Card className="border-amber-500/40 bg-gradient-to-br from-slate-900/95 via-slate-950/90 to-amber-950/20 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-500" />
            <CardHeader className="p-6 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className={
                    isUserA
                      ? "border-sky-500/40 bg-sky-500/10 text-sky-300 font-mono text-xs px-3 py-1"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-xs px-3 py-1"
                  }
                >
                  {isUserA ? "★ DESIGNATED SPACE" : "● CONFIRMED RESERVATION"}
                </Badge>
                <span className="text-xs font-mono text-slate-400">
                  Vehicle: <strong className="text-white">{activeVehicleId}</strong>
                </span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black font-mono text-white mt-3">
                Space {assignedSpaceId}
              </CardTitle>
              <CardDescription className="text-sm font-mono text-slate-300">
                Level B2 · {vehicleDef.scenario.zone || "Zone B (Upper Island)"}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-6">
              {/* Specification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">SPACE</span>
                  <span className="text-lg font-black font-mono text-white mt-1 block">
                    {assignedSpaceId}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">ZONE</span>
                  <span className="text-lg font-black font-mono text-sky-400 mt-1 block">
                    {vehicleDef.scenario.zone ? vehicleDef.scenario.zone.replace("Zone ", "") : "B"}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">LEVEL</span>
                  <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">B2</span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">WINDOW</span>
                  <span className="text-xs font-bold font-mono text-amber-300 mt-2 block truncate">
                    {isUserA ? "Designated Permit" : vehicleDef.scenario.reservationWindow || "4:00 PM – 6:00 PM"}
                  </span>
                </div>
              </div>

              {/* Distinction Banner */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-950/30 p-3.5 flex items-start gap-3 text-xs font-mono text-sky-200/90">
                <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Verified Digital Twin Bay Allocation</strong>
                  <span>
                    The navigation system will guide your vehicle directly from gateway <strong>ACCESS_POINT_B2</strong> to bay <strong>{assignedSpaceId}</strong> using the facility route network.
                  </span>
                </div>
              </div>

              {/* Start Navigation CTA */}
              <div className="pt-2">
                <Link href="/user/navigation" className="block w-full">
                  <Button
                    onClick={startNavigation}
                    size="lg"
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-sm h-12 shadow-xl shadow-sky-950 gap-2"
                  >
                    <Navigation className="h-5 w-5" />
                    <span>START NAVIGATION</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── State B: No Reservation Redirect ── */
        <Card className="border-slate-800 bg-slate-900/60 p-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <CalendarCheck className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-mono text-white">No Prior Booking for {activeVehicleId}</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto font-mono">
              You can still park. Real-time facility intelligence has available spaces ready for allocation.
            </p>
          </div>
          <Link href="/user/parking/find" className="inline-block pt-2">
            <Button className="bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs gap-2">
              <span>GO TO FIND PARKING</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
