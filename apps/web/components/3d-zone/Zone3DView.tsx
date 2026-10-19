"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const UnifiedTwinCanvas3D = dynamic(
  () =>
    import("@/components/digital-twin/UnifiedTwinCanvas3D").then(
      (mod) => mod.UnifiedTwinCanvas3D
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-140px)] min-h-[640px] rounded-2xl border border-slate-800 bg-[#050811] flex flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Initializing Canonical 3D Digital Twin...
        </span>
      </div>
    ),
  }
);

export function Zone3DView() {
  return (
    <div className="space-y-3 p-3 h-screen flex flex-col bg-[#050811] select-none">
      <header className="shrink-0 flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Link href="/digital-twin">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-mono border-slate-700 bg-slate-900/80 text-slate-200">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Digital Twin</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-sky-400" />
            <h1 className="text-sm font-bold text-white font-mono">
              3D Parking Twin — Carparking-01 B2
            </h1>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full min-h-0 relative">
        <UnifiedTwinCanvas3D />
      </div>
    </div>
  );
}
