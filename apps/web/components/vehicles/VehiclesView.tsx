"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Car, Search, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";

export function VehiclesView() {
  const vehicles = useDemoMovieStore((s) => s.vehicles);
  const selectVehicle = useDemoMovieStore((s) => s.selectVehicle);
  const selectSlot = useDemoMovieStore((s) => s.selectSlot);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter !== "all" && v.state !== statusFilter) {
        return false;
      }
      if (
        searchTerm.trim() &&
        !v.plate.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !v.assignedSlot.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !v.model.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [vehicles, statusFilter, searchTerm]);

  const parkedCount = vehicles.filter((v) => v.state === "PARKED" || v.state === "STAYING").length;
  const movingCount = vehicles.filter((v) => v.state === "ENTERING" || v.state === "EXITING").length;
  const exitedCount = vehicles.filter((v) => v.state === "EXITED").length;

  const activeDialogVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        icon={Car}
        title="Vehicles"
        subtitle="Complete vehicle registry, dwell tracking, and real-time spatial positioning"
        badge={
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400">
            30 Deterministic Vehicles
          </span>
        }
        rightSlot={
          <Link href="/digital-twin">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Spatial Digital Twin</span>
            </Button>
          </Link>
        }
      />

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">TOTAL REGISTRY</p>
            <p className="text-2xl font-bold font-mono text-foreground mt-0.5">{vehicles.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">10 Tracked · 20 Static</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">CURRENTLY PARKED</p>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{parkedCount}</p>
            <p className="text-[10px] text-emerald-400/80 mt-1">Active bay occupancy</p>
          </CardContent>
        </Card>

        <Card className="border-sky-500/30 bg-sky-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-sky-400">IN TRANSIT</p>
            <p className="text-2xl font-bold font-mono text-sky-400 mt-0.5">{movingCount}</p>
            <p className="text-[10px] text-sky-400/80 mt-1">Driving along aisles</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-amber-400">EXITED FACILITY</p>
            <p className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{exitedCount}</p>
            <p className="text-[10px] text-amber-400/80 mt-1">Cleared CAM-16 gate</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ── */}
      <Card className="border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search plate, bay (SP-xx), or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", "PARKED", "ENTERING", "EXITING", "EXITED", "UPCOMING"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="h-8 text-xs font-mono uppercase"
              >
                {st}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="px-4 py-3">Plate Number</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Model / Type</th>
                  <th className="px-4 py-3">Assigned Space</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                {filteredVehicles.map((veh) => (
                  <tr key={veh.id} className="hover:bg-accent/40 transition-colors">
                    {/* Plate */}
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: veh.color }} />
                      <span className="font-bold text-xs">{veh.plate}</span>
                      <span className="text-[9px] text-muted-foreground px-1 py-0.2 bg-muted/60 rounded">
                        DEMO DATA
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          veh.isTypeA
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : "bg-slate-700/40 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {veh.isTypeA ? "Type A (Tracked)" : "Type B (Static)"}
                      </span>
                    </td>

                    {/* Model */}
                    <td className="px-4 py-3 text-muted-foreground">{veh.model}</td>

                    {/* Assigned Space */}
                    <td className="px-4 py-3 font-bold text-primary">{veh.assignedSlot}</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          veh.state === "PARKED" || veh.state === "STAYING"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : veh.state === "ENTERING" || veh.state === "EXITING"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 animate-pulse"
                            : veh.state === "EXITED"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {veh.state}
                      </span>
                    </td>

                    {/* Schedule */}
                    <td className="px-4 py-3 text-muted-foreground text-[10px]">
                      {veh.isTypeA ? (
                        <span>
                          Arr: {veh.entryTime}s · Dep: {veh.exitStartTime < 999 ? `${veh.exitStartTime}s` : "End"}
                        </span>
                      ) : (
                        <span>Parked from start (t=0)</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] gap-1"
                          onClick={() => setSelectedVehicleId(veh.id)}
                        >
                          <Eye className="h-3 w-3" />
                          <span>Inspect</span>
                        </Button>
                        <Link
                          href="/digital-twin"
                          onClick={() => {
                            selectVehicle(veh.id);
                            selectSlot(veh.assignedSlot);
                          }}
                        >
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1">
                            <ExternalLink className="h-3 w-3" />
                            <span>In Twin</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Vehicle Inspector Dialog ── */}
      {activeDialogVehicle && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50"
          onClick={() => setSelectedVehicleId(null)}
        >
          <Card
            className="w-full max-w-md border-border bg-card/95 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: activeDialogVehicle.color }}
                />
                <h2 className="text-base font-bold font-mono text-foreground">
                  {activeDialogVehicle.plate}
                </h2>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {activeDialogVehicle.isTypeA ? "Tracked Movie Vehicle" : "Static Background Vehicle"}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Assigned Parking Bay</span>
                <span className="font-mono font-bold text-primary">{activeDialogVehicle.assignedSlot}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Current State</span>
                <span className="font-mono font-bold text-emerald-400">{activeDialogVehicle.state}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Vehicle Model</span>
                <span className="font-mono text-foreground">{activeDialogVehicle.model}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">License Plate Provenance</span>
                <span className="font-mono text-muted-foreground">Synthetic DEMO DATA</span>
              </div>
              {activeDialogVehicle.isTypeA && (
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground">Entry / Exit Schedule</span>
                  <span className="font-mono text-foreground">
                    {activeDialogVehicle.entryTime}s entry · {activeDialogVehicle.exitStartTime}s exit
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedVehicleId(null)}
              >
                Close
              </Button>
              <Link
                href="/digital-twin"
                onClick={() => {
                  selectVehicle(activeDialogVehicle.id);
                  selectSlot(activeDialogVehicle.assignedSlot);
                }}
              >
                <Button size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>View in Digital Twin</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
