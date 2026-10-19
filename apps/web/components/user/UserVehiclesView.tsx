"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useCctvEvidenceModalStore } from "@/store/useCctvEvidenceModalStore";
import { DEMO_VEHICLES, DEMO_VEHICLE_IDS } from "@/config/demoVehicles";
import type { CctvCameraId } from "@/components/evidence/CctvEvidenceViewer";

export function UserVehiclesView() {
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const selectVehicle = useUserPortalStore((s) => s.selectVehicle);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            Vehicle Fleet Registry
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
          MY DEMO VEHICLES
        </h1>
        <p className="text-sm text-slate-400 mt-1 font-mono">
          5 CCTV-grounded demo vehicles with clean separation between CCTV evidence and scenario assignment.
        </p>
      </div>

      {/* ── 5 CCTV-Grounded Vehicles Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEMO_VEHICLE_IDS.map((vid) => {
          const v = DEMO_VEHICLES[vid]!;
          const isActive = vid === activeVehicleId;
          const hasRes = v.scenario.hasReservation;

          return (
            <Card
              key={vid}
              className={`border transition-all shadow-xl overflow-hidden ${
                isActive
                  ? "border-sky-500 bg-gradient-to-br from-slate-900/95 to-sky-950/40"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: v.scenario.color }}
              />
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-white">
                      {v.evidence.vehicleId}
                    </span>
                    {isActive && (
                      <Badge className="bg-sky-500 text-slate-950 font-mono text-[10px] font-bold">
                        ACTIVE DRIVER
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[9px] ${
                        vid === "VEH-001"
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-slate-700 bg-slate-800/40 text-slate-400"
                      }`}
                    >
                      {vid === "VEH-001" ? "PARTIALLY EVIDENCE-BACKED" : "APPLICATION-ONLY"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${
                        hasRes
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border-slate-700 text-slate-400"
                      }`}
                    >
                      {hasRes ? "RESERVED" : "NO RESERVATION"}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs font-mono text-slate-300">
                  {v.scenario.model} · Entry Gateway ACCESS_POINT_B2
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-1 space-y-4">
                {/* Clean Separation: ANPR Benchmark vs Demo Scenario */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {/* ANPR Machine Benchmark */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-sky-400 block">
                        ANPR BENCHMARK
                      </span>
                      <span className="text-[9px] text-amber-300 font-mono">
                        INDEPENDENT
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Plate:</span>
                      {v.evidence.plate ? (
                        <span className="text-sky-400 font-bold font-mono">
                          {v.evidence.plate}
                        </span>
                      ) : (
                        <span className="text-amber-400/90 italic">Unreadable</span>
                      )}
                    </div>
                    {v.evidence.plate && v.evidence.plateConfidence !== null && (
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">OCR Conf:</span>
                        <span className="text-slate-300">
                          {Math.round(v.evidence.plateConfidence * 100)}% ({v.evidence.ocrEngine})
                        </span>
                      </div>
                    )}
                    {v.evidence.trackId !== undefined && (
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Track:</span>
                        <span className="text-slate-300">
                          #{v.evidence.trackId} (test_video.mp4)
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300 border-t border-slate-800/80 pt-1">
                      <span className="text-slate-400">CCTV Observation:</span>
                      <span className="text-emerald-400 font-bold text-[10px]">
                        {vid === "VEH-001" ? "KA05ML7220 (Visually observed, OCR unverified)" : "CAM-01 Footage"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Identity Link:</span>
                      <span className="text-amber-300 font-semibold text-[10px]">
                        UNVERIFIED
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 p-1 rounded border border-amber-500/20 text-center font-semibold mt-1">
                      ANPR BENCHMARK ≠ PHYSICAL CCTV IDENTITY
                    </div>
                    {v.evidence.cameraId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => useCctvEvidenceModalStore.getState().openModal({
                          camera: v.evidence.cameraId as CctvCameraId,
                          trackId: v.evidence.trackId,
                          plate: v.evidence.plate ?? undefined,
                        })}
                        className="w-full mt-2 h-7 text-[10px] font-mono font-semibold border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 gap-1"
                      >
                        <Video className="h-3 w-3" />
                        <span>Inspect CAM-01 Footage</span>
                      </Button>
                    )}
                  </div>

                  {/* Demo Scenario */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">
                      DEMO SCENARIO
                    </span>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Space:</span>
                      <span className="text-white font-bold">
                        {v.scenario.assignedSpaceId || v.scenario.defaultRecommendedSpaceId || "Dynamic"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Level:</span>
                      <span>{v.scenario.level}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Window:</span>
                      <span className="truncate">{v.scenario.reservationWindow || "Open"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {!isActive ? (
                    <Button
                      onClick={() => selectVehicle(vid)}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-mono border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      <span>Switch to {vid}</span>
                    </Button>
                  ) : (
                    <Link href="/user/dashboard" className="w-full">
                      <Button
                        size="sm"
                        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold gap-1.5"
                      >
                        <span>Open Active Dashboard</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
