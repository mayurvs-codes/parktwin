"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface VehicleSearchProps {
  /** Plate query — delegated to the backend (`/integration/vehicles?plate=`). */
  plate: string;
  onPlateChange: (value: string) => void;
  /** Slot query — presentation-only client filter. */
  slot: string;
  onSlotChange: (value: string) => void;
}

/**
 * Search controls for the vehicle list. Plate search uses the backend's
 * capability; slot search is a presentation-only text filter applied
 * client-side (the gateway has no slot param on the vehicles endpoint).
 */
export function VehicleSearch({ plate, onPlateChange, slot, onSlotChange }: VehicleSearchProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={plate}
          onChange={(e) => onPlateChange(e.target.value)}
          placeholder="Search by plate…"
          aria-label="Search by license plate"
          className="pl-9"
        />
      </div>
      <div className="relative w-full sm:max-w-xs">
        <Input
          type="search"
          value={slot}
          onChange={(e) => onSlotChange(e.target.value)}
          placeholder="Filter by slot…"
          aria-label="Filter by slot"
        />
      </div>
    </div>
  );
}
