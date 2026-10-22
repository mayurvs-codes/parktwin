"use client";

import React from "react";
import { Car, Clock, CalendarCheck, TrendingUp, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { bayLabel } from "@/utils/bayLabel";

const WEEKLY_DATA = [
  { day: "Mon", hours: 0.8 },
  { day: "Tue", hours: 1.2 },
  { day: "Wed", hours: 0.4 },
  { day: "Thu", hours: 1.5 },
  { day: "Fri", hours: 0.3 },
  { day: "Sat", hours: 0.0 },
  { day: "Sun", hours: 0.0 },
];

/**
 * UserActivity:
 * Lightweight personal driver activity view.
 * Shows only personal driver information:
 * - 12 Trips
 * - 4.2h Parked
 * - 2 Reservations
 * - 28m Avg. Duration
 * - Small weekly chart
 * (Zero administrative metrics: no camera diagnostics, FPS, OCR, or YOLO).
 */
export function UserActivity() {
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="border-b border-slate-800/80 pb-5">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
          Personal Summary
        </span>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono mt-1">
          MY ACTIVITY
        </h1>
        <p className="text-sm text-slate-400 font-mono mt-0.5">
          Driver history and parking duration summary for {activeVehicleId} ({vehicleDef.scenario.model}).
        </p>
      </div>

      {/* ── 4 Key Personal KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="text-slate-400 text-xs font-mono flex items-center justify-between">
            <span>TRIPS</span>
            <Car className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-white">
            12
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Total completed trips
          </span>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="text-slate-400 text-xs font-mono flex items-center justify-between">
            <span>PARKED</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
            4.2h
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Total parking time
          </span>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="text-slate-400 text-xs font-mono flex items-center justify-between">
            <span>RESERVATIONS</span>
            <CalendarCheck className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400">
            2
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Pre-booked spots
          </span>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="text-slate-400 text-xs font-mono flex items-center justify-between">
            <span>AVG. DURATION</span>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-indigo-400">
            28m
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Per session turnaround
          </span>
        </Card>
      </div>

      {/* ── Small Weekly Chart ── */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold font-mono text-white">
            WEEKLY PARKING HOURS
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 font-mono">
            Daily duration recorded over the past 7 days (hours)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: "#334155" }}
                  unit="h"
                />
                <Tooltip
                  cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs font-mono text-white shadow-xl">
                        <span className="text-slate-400 block">{payload[0]?.payload.day}</span>
                        <span className="text-sky-400 font-bold">{payload[0]?.value} hours parked</span>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                  {WEEKLY_DATA.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hours > 1.0 ? "#38bdf8" : entry.hours > 0 ? "#0284c7" : "#1e293b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Trips ── */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-sky-400" />
            <CardTitle className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Recent Parking Trips
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-800/60 font-mono text-xs">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                🅿️
              </div>
              <div>
                <span className="text-white font-bold block">Space {bayLabel("SP-07")} · Zone B</span>
                <span className="text-slate-400 text-[11px]">Today · 14:15 - 14:48</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 font-bold block">33m</span>
              <span className="text-slate-500 text-[10px]">Free Demo</span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
                🅿️
              </div>
              <div>
                <span className="text-white font-bold block">Space {bayLabel("SP-14")} · Zone B</span>
                <span className="text-slate-400 text-[11px]">Yesterday · 09:30 - 10:15</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sky-400 font-bold block">45m</span>
              <span className="text-slate-500 text-[10px]">Free Demo</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
