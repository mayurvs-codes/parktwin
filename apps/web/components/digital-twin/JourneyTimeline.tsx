"use client";

import { LogIn, ParkingSquare, LogOut, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type VehicleJourney } from "@/services/journey";

interface JourneyTimelineProps {
  journey: VehicleJourney;
  compact?: boolean;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return isoString;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function JourneyTimeline({ journey, compact = false }: JourneyTimelineProps) {
  const isEntered = Boolean(journey.entry_time);
  const isParked = Boolean(journey.parked_at || journey.parking_slot);
  const isExited = Boolean(journey.exit_time || journey.status === "exited");

  return (
    <div className={cn("rounded-lg border border-border/80 bg-background/50 p-3 space-y-3", compact && "p-2")}>
      {/* Header with plate and vehicle metadata */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
            <Car className="h-4 w-4" />
          </div>
          <div>
            <div className="font-mono font-bold text-sm tracking-wide text-foreground">
              {journey.license_plate}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {journey.color} {journey.brand !== "Unknown" ? journey.brand : ""} {journey.vehicle_type}
            </div>
          </div>
        </div>
        <Badge
          variant={
            journey.status === "parked"
              ? "default"
              : journey.status === "entering"
              ? "secondary"
              : "outline"
          }
          className="text-[10px] font-bold uppercase tracking-wider capitalize"
        >
          {journey.status}
        </Badge>
      </div>

      {/* 3-Station Flow */}
      <div className="grid grid-cols-3 gap-2 relative">
        {/* Step 1: Entry */}
        <div
          className={cn(
            "flex flex-col items-center text-center p-2 rounded-md border text-xs transition-colors",
            isEntered
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-border/50 bg-muted/20 opacity-50"
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full mb-1 text-white text-xs",
              isEntered ? "bg-emerald-500" : "bg-muted-foreground/30"
            )}
          >
            <LogIn className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-foreground text-[11px]">1. Entry</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {formatTime(journey.entry_time)}
          </span>
          {journey.entry_confidence > 0 && (
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400">
              {Math.round(journey.entry_confidence * 100)}% conf
            </span>
          )}
        </div>

        {/* Step 2: Parking */}
        <div
          className={cn(
            "flex flex-col items-center text-center p-2 rounded-md border text-xs transition-colors",
            isParked
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border/50 bg-muted/20 opacity-50"
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full mb-1 text-white text-xs",
              isParked ? "bg-amber-500" : "bg-muted-foreground/30"
            )}
          >
            <ParkingSquare className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-foreground text-[11px]">2. Parking</span>
          <span className="text-[10px] font-mono font-bold text-primary">
            {journey.parking_slot ? `Slot ${journey.parking_slot}` : isEntered ? "In Transit" : "Pending"}
          </span>
          {journey.parked_at && (
            <span className="text-[9px] text-muted-foreground font-mono">
              {formatTime(journey.parked_at)}
            </span>
          )}
        </div>

        {/* Step 3: Exit */}
        <div
          className={cn(
            "flex flex-col items-center text-center p-2 rounded-md border text-xs transition-colors",
            isExited
              ? "border-rose-500/30 bg-rose-500/5"
              : "border-border/50 bg-muted/20 opacity-50"
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full mb-1 text-white text-xs",
              isExited ? "bg-rose-500" : "bg-muted-foreground/30"
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-foreground text-[11px]">3. Exit</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {isExited ? formatTime(journey.exit_time) : "Active in Facility"}
          </span>
          {journey.duration_seconds && (
            <span className="text-[9px] text-rose-600 dark:text-rose-400 font-mono font-semibold">
              Stay: {formatDuration(journey.duration_seconds)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
