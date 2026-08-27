"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { ParkingSlotView } from "@/types/parking";
import { SLOT_STATUS_CONFIG } from "./slotStatus";

export interface ParkingSlotProps {
  view: ParkingSlotView;
  /** Whether this slot is the currently selected one (drives aria-pressed). */
  selected?: boolean;
  /** Called with the slot id when the user activates the tile. */
  onSelect: (slotId: string) => void;
}

/**
 * Reusable, presentation-only parking-slot tile. Renders the slot id, its
 * status (icon + label + color), and the parked vehicle's plate when occupied.
 * Status is conveyed through color **and** an icon + text label so the tile is
 * accessible without relying on color alone. Selecting the tile opens the
 * read-only detail panel.
 */
function ParkingSlotComponent({ view, selected, onSelect }: ParkingSlotProps) {
  const { slot, status, plate } = view;
  const cfg = SLOT_STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const ariaLabel = `Slot ${slot.slot_id}, ${cfg.label}${plate ? `, vehicle ${plate}` : ""}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(slot.slot_id)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={cn(
        "group relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-md border p-2 text-center transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        cfg.tile,
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="truncate text-xs font-semibold tracking-tight">{slot.slot_id}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          cfg.pill
        )}
      >
        {cfg.label}
      </span>
      {plate && (
        <span className="truncate text-[11px] font-medium tabular-nums" title={plate}>
          {plate}
        </span>
      )}
    </button>
  );
}

/** Memoized so only slots whose view actually changed re-render on updates. */
export const ParkingSlot = memo(ParkingSlotComponent);
