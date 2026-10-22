"use client";

import React from "react";
import {
  Activity,
  Car,
  LogIn,
  LogOut,
  ParkingSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDemoMovieStore } from "@/store/useDemoMovieStore";
import { bayLabel } from "@/utils/bayLabel";

export function RecentActivityPanel() {
  const events = useDemoMovieStore((s) => s.events);

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {events.length} Events Logged
        </span>
      </CardHeader>
      <CardContent className="pt-4">
        {events.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Activity className="h-8 w-8 text-muted-foreground/30" />
            <p className="font-medium text-foreground">No recent activity</p>
            <p className="text-[11px] max-w-sm">
              Press &ldquo;START PROJECT&rdquo; above to launch the deterministic demo movie and stream real-time gate and bay events.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/30" role="list">
            {events.slice(0, 10).map((ev) => {
              const isEntry = ev.eventType === "VEHICLE_ENTRY";
              const isPark = ev.eventType === "VEHICLE_PARKED";
              const isExit = ev.eventType === "VEHICLE_EXITING" || ev.eventType === "VEHICLE_EXITED";

              const Icon = isEntry ? LogIn : isPark ? ParkingSquare : isExit ? LogOut : Car;
              const iconColor = isEntry ? "text-sky-400 bg-sky-500/10" : isPark ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10";

              return (
                <li key={ev.id} className="py-2.5 flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/40 ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {ev.message}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {ev.plate} · {bayLabel(ev.slotId)} · {ev.camera}
                    </p>
                  </div>
                  <time className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    {ev.timeLabel}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
