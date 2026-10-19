"use client";

import React from "react";
import dynamic from "next/dynamic";

const ParkingZone3D = dynamic(
  () => import("./ParkingZone3D").then((mod) => mod.ParkingZone3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-140px)] min-h-[640px] rounded-2xl border border-slate-800 bg-[#050811] flex flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Initializing 3D Parking Zone...
        </span>
      </div>
    ),
  }
);

export function Zone3DView() {
  return (
    <div className="space-y-4">
      <ParkingZone3D />
    </div>
  );
}
