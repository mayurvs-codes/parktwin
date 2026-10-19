"use client";

import React from "react";
import {
  Sparkles,
  Navigation,
  ParkingSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { useRouter } from "next/navigation";

export function UserFindParkingView() {
  const router = useRouter();
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId);
  const assignSpace = useUserPortalStore((s) => s.assignSpace);
  const startNavigation = useUserPortalStore((s) => s.startNavigation);
  const conflictError = useUserPortalStore((s) => s.conflictError);
  const clearConflictError = useUserPortalStore((s) => s.clearConflictError);

  // Authoritative Focused Demo Zone state
  const activePersona = useSharedDemoState((s) => s.activePersona);
  const focusedSpaces = useSharedDemoState((s) => s.spaces);
  const reserveSpace = useSharedDemoState((s) => s.reserveSpace);

  // Filter available bays in the focused demo zone (SP-01 to SP-20)
  const availableSpaces = Object.values(focusedSpaces).filter((s) => s.status === "AVAILABLE");
  const availableCount = availableSpaces.length;

  // Authoritative recommended space: SP-14 for User B, or first available bay
  const defaultRec =
    availableSpaces.find((s) => s.id === "SP-14") ||
    availableSpaces[0];

  const handleSelectAndNavigate = (spaceId: string) => {
    // 1. Reserve in shared demo state (instantly synchronizes to Digital Twin & updates KPIs)
    reserveSpace(spaceId, activePersona === "USER_B" ? "USER_B" : "GUEST");

    // 2. Assign to user portal navigation store
    const success = assignSpace(spaceId);
    if (success) {
      startNavigation();
      router.push("/user/navigation");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* ── Slot Conflict Alert ── */}
      {conflictError && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3.5 flex items-center justify-between text-xs font-mono text-rose-300 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-rose-400">Conflict Alert:</span>
            <span>{conflictError}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearConflictError}
            className="h-6 text-[11px] font-mono text-rose-400 hover:text-white hover:bg-rose-500/20 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            Drive-In Allocation
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
          NO RESERVATION FOUND
        </h1>
        <p className="text-sm text-slate-400 mt-1 font-mono">
          You can still park. Real-time facility monitoring detects{" "}
          <strong className="text-emerald-400">{availableCount}</strong> parking spaces currently available.
        </p>
      </div>

      {/* ── Facility Full Capacity Edge State ── */}
      {availableCount === 0 && (
        <Card className="border-rose-500/40 bg-rose-950/20 p-6 text-center space-y-3">
          <div className="text-rose-400 font-mono font-bold text-sm uppercase tracking-wider">
            ● FACILITY AT MAXIMUM CAPACITY
          </div>
          <p className="text-xs font-mono text-slate-300 max-w-md mx-auto">
            All 60 parking bays are currently occupied in the shared facility twin. Please hold at ACCESS_POINT_B2 until an active vehicle vacates a bay.
          </p>
        </Card>
      )}

      {/* ── Recommended Space Spotlight Card ── */}
      {defaultRec && (
        <Card className="border-sky-500/50 bg-gradient-to-br from-slate-900/90 via-sky-950/30 to-indigo-950/30 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500" />
          <CardHeader className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-sky-400">
                <Sparkles className="h-4 w-4 text-sky-400" />
                [ RECOMMENDED SPACE ]
              </span>
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs">
                NEAREST TO ENTRANCE
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mt-2">
              <CardTitle className="text-3xl sm:text-4xl font-black font-mono text-white">
                {defaultRec.id}
              </CardTitle>
              <CardDescription className="text-sm font-mono text-sky-300">
                {defaultRec.zone} · Level B2
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-4">
            <p className="text-xs font-mono text-slate-300">
              Optimal driving path from ACCESS_POINT_B2 with minimal aisle traversal.
            </p>

            <Button
              onClick={() => handleSelectAndNavigate(defaultRec.id)}
              size="lg"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-sm h-12 shadow-xl shadow-sky-950 gap-2"
            >
              <Navigation className="h-5 w-5" />
              <span>SELECT & START NAVIGATION</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Available Parking Bays Across Zones ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ParkingSquare className="h-4 w-4 text-sky-400" />
            AVAILABLE PARKING ({availableCount} BAYS ONLINE)
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Synchronized with Admin Twin
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {availableSpaces.map((space) => {
            const isAssigned = space.id === assignedSpaceId;

            return (
              <Card
                key={space.id}
                className={`border transition-all hover:border-sky-500/80 ${
                  isAssigned
                    ? "border-sky-500 bg-sky-950/40"
                    : "border-slate-800 bg-slate-900/60 hover:bg-slate-800/60"
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black font-mono text-white">
                      {space.id}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                      FREE
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono text-slate-400 mt-1">
                    {space.zone} · Level B2
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAndNavigate(space.id)}
                    className="w-full text-xs font-mono border-slate-700 hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-colors"
                  >
                    <span>Reserve & Navigate</span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
