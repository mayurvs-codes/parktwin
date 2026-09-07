"use client";

import React from "react";
import Link from "next/link";
import { ParkingSquare, Car, CheckCircle2, ShieldCheck, Percent, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { ParkingLegend } from "./ParkingLegend";

export function LiveParkingView() {
  const spaces = useDemoMovieStore((s) => s.spaces);
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const selectedSlotId = useDemoMovieStore((s) => s.selectedSlotId);
  const selectSlot = useDemoMovieStore((s) => s.selectSlot);
  const selectVehicle = useDemoMovieStore((s) => s.selectVehicle);

  const totalSlots = spaces.length; // 60
  const occupiedSlots = spaces.filter((s) => s.isOccupied).length;
  const freeSlots = totalSlots - occupiedSlots;
  const occupancyPct = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  // Active parked or moving vehicles
  const activeVehicles = vehicles.filter(
    (v) => v.state === "ENTERING" || v.state === "PARKED" || v.state === "STAYING" || v.state === "EXITING"
  );

  // Group 60 spaces by zones
  const zones = [
    { name: "Zone A (North Perimeter)", prefix: "Zone A", filter: (s: typeof spaces[0]) => s.zone.includes("Zone A") },
    { name: "Zone B (Upper Island)", prefix: "Zone B", filter: (s: typeof spaces[0]) => s.zone.includes("Zone B") },
    { name: "Zone C (Central Ramp Row)", prefix: "Zone C", filter: (s: typeof spaces[0]) => s.zone.includes("Zone C") },
    { name: "Zone D (Lower Island)", prefix: "Zone D", filter: (s: typeof spaces[0]) => s.zone.includes("Zone D") },
    { name: "Zone E (South Perimeter)", prefix: "Zone E", filter: (s: typeof spaces[0]) => s.zone.includes("Zone E") },
    { name: "Zone F (West Wing)", prefix: "Zone F", filter: (s: typeof spaces[0]) => s.zone.includes("Zone F") },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        icon={ParkingSquare}
        title="Live Parking"
        subtitle="Real-time occupancy status, bay allocation, and active sessions (B2 Facility)"
        badge={
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            60 Operational Spaces
          </span>
        }
        rightSlot={
          <div className="flex items-center gap-2">
            <Link href="/digital-twin">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View Digital Twin</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Summary Metric Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">TOTAL SPACES</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{totalSlots}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Occupied: Green */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">OCCUPIED (GREEN)</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{occupiedSlots}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Car className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Available: Red */}
        <Card className="border-red-500/30 bg-red-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-red-400">AVAILABLE (RED)</p>
              <p className="text-2xl font-bold font-mono text-red-400 mt-0.5">{freeSlots}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Occupancy % */}
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">OCCUPANCY</p>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{occupancyPct}%</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Percent className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 60 Spaces Grid by Zones ── */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-semibold">60 Facility Parking Bays</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live presentation inventory · Locked Scheme: GREEN = Occupied, RED = Available
            </p>
          </div>
          <ParkingLegend />
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          {zones.map((zone) => {
            const zoneSpaces = spaces.filter(zone.filter);
            if (zoneSpaces.length === 0) return null;

            return (
              <div key={zone.name} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    {zone.name} ({zoneSpaces.length} Bays)
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                  {zoneSpaces.map((space) => {
                    const isSelected = space.id === selectedSlotId;
                    const isOccupied = space.isOccupied;

                    return (
                      <button
                        key={space.id}
                        onClick={() => {
                          selectSlot(space.id);
                          if (space.currentVehicleId) {
                            selectVehicle(space.currentVehicleId);
                          }
                        }}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 text-center ${
                          isSelected
                            ? "ring-2 ring-sky-400 border-sky-400 bg-sky-500/15"
                            : isOccupied
                            ? "border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-950/20"
                            : "border-red-500/50 bg-red-500/15 hover:bg-red-500/20 text-red-300 shadow-sm shadow-red-950/20"
                        }`}
                      >
                        {/* Space Name */}
                        <span className="font-mono font-bold text-sm text-foreground">
                          {space.name}
                        </span>

                        {/* Status Label */}
                        <span
                          className={`mt-1 text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded ${
                            isOccupied
                              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                              : "bg-red-500/25 text-red-300 border border-red-500/40"
                          }`}
                        >
                          {isOccupied ? "Occupied" : "Available"}
                        </span>

                        {/* Plate Pill if Occupied */}
                        {isOccupied && space.currentPlate && (
                          <span className="mt-1 font-mono text-[9px] text-emerald-400 font-bold truncate max-w-full">
                            {space.currentPlate}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Active Parking Sessions Table ── */}
      <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Car className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Active Parking Sessions</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20">
              {activeVehicles.length} Active
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Authoritative Timeline State
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {activeVehicles.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No Active Sessions</p>
              <p className="text-[11px] max-w-sm">
                All runtime bays are currently available. Vehicles entering via ACCESS_POINT_B2 (CAM-01) will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-2.5">Plate Number</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Assigned Bay</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Model</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                  {activeVehicles.map((veh) => (
                    <tr key={veh.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: veh.color }} />
                        <span>{veh.plate}</span>
                        <span className="text-[9px] text-muted-foreground px-1 bg-muted/60 rounded">DEMO DATA</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {veh.isTypeA ? "Type A (Tracked)" : "Type B (Static)"}
                      </td>
                      <td className="px-4 py-3 font-bold text-primary">
                        {veh.assignedSlot}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          veh.state === "PARKED" || veh.state === "STAYING"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-sky-500/10 text-sky-400 border border-sky-500/30"
                        }`}>
                          {veh.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{veh.model}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href="/digital-twin"
                          onClick={() => {
                            selectVehicle(veh.id);
                            selectSlot(veh.assignedSlot);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <span>View in Twin</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
