"use client";

import React from "react";
import { Car, CheckCircle2, ShieldCheck, Video, Clock, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

export function TwinKPIs() {
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const cameras = useDemoMovieStore((s) => s.cameras);

  const totalSlots = spaces.length; // 60 spaces
  const occupiedSlots = spaces.filter((s) => s.isOccupied).length;
  const freeSlots = totalSlots - occupiedSlots;
  const occupancyPct = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  // Active vehicles in facility (ENTERING, PARKED, STAYING, EXITING)
  const activeVehicles = vehicles.filter(
    (v) => v.state !== "UPCOMING" && v.state !== "EXITED"
  ).length;

  const camerasOnline = cameras.filter((c) => c.status === "ONLINE").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Slots */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-md">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Slots</p>
            <p className="text-xl font-bold text-slate-100 mt-0.5">{totalSlots}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Occupied Slots */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-md">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Occupied</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{occupiedSlots}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Car className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Available Slots */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-md">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Available Free</p>
            <p className="text-xl font-bold text-red-400 mt-0.5">{freeSlots}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Occupancy % */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-md">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Occupancy</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">{occupancyPct}%</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Percent className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Active Vehicles */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-md">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Vehicles</p>
            <p className="text-xl font-bold text-indigo-400 mt-0.5">{activeVehicles}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      {/* Cameras Online */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-md">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">CCTV Online</p>
            <p className="text-xl font-bold text-sky-400 mt-0.5">{camerasOnline}/16</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
            <Video className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
