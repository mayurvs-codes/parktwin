"use client";

import React from "react";
import Link from "next/link";
import { Car, Clock, ArrowUpRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionDTO } from "@/types/parking";
import { formatDuration } from "@/lib/format";

interface ActiveSessionsTableProps {
  sessions: SessionDTO[];
  isLoading: boolean;
  onSelectSlot?: (slotId: string) => void;
}

export function ActiveSessionsTable({
  sessions,
  isLoading,
  onSelectSlot,
}: ActiveSessionsTableProps) {
  const activeList = sessions.filter((s) => s.is_active);

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <Car className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Active Parking Sessions</CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20">
            {activeList.length} Active
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          Authoritative Gateway State
        </span>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No Active Sessions</p>
            <p className="text-[11px] max-w-sm">
              All runtime bays are currently available. Vehicles entering via CAM-01 will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="px-4 py-2.5">Plate Number</th>
                  <th className="px-4 py-2.5">Bay / Slot</th>
                  <th className="px-4 py-2.5">Camera Source</th>
                  <th className="px-4 py-2.5">Entry Time</th>
                  <th className="px-4 py-2.5">Dwell Duration</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {activeList.map((session, idx) => {
                  const hasViolations = (session.violation_flags || []).length > 0;
                  return (
                    <tr
                      key={session.session_uid || idx}
                      className="hover:bg-muted/30 transition-colors font-mono"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-2 py-0.5 rounded border border-border bg-background font-bold tracking-wider text-foreground">
                            {session.license_plate || "UNKNOWN"}
                          </span>
                          {hasViolations && (
                            <span title={session.violation_flags.join(", ")}>
                              <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {session.slot_id ? (
                          <button
                            type="button"
                            onClick={() => onSelectSlot?.(session.slot_id!)}
                            className="font-bold text-primary hover:underline"
                          >
                            {session.slot_id.toUpperCase()}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">In Transit</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {session.camera_id || "CAM-01"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {session.entry_time
                          ? new Date(session.entry_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{formatDuration(session.duration_seconds || 0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/vehicles?search=${encodeURIComponent(session.license_plate || "")}`}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <span>Vehicle Dossier</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
