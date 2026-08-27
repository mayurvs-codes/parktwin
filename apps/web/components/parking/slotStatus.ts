import type { LucideIcon } from "lucide-react";
import { Ban, Car, CircleParking, HelpCircle, Lock } from "lucide-react";
import type { SlotStatus } from "@/types/parking";

/**
 * Single source of truth for how each slot status is rendered. Consumed by
 * `ParkingSlot`, `ParkingLegend`, and `SlotDetailsDialog` so colors, labels,
 * and icons stay consistent across the visualization (PROJECT_MEMORY.md §8 —
 * one owner per concern). No business logic — purely presentation.
 */
export interface SlotStatusStyle {
  label: string;
  icon: LucideIcon;
  /** Container classes for the slot tile (border/background/text). */
  tile: string;
  /** Classes for the small status pill. */
  pill: string;
}

export const SLOT_STATUS_CONFIG: Record<SlotStatus, SlotStatusStyle> = {
  available: {
    label: "Available",
    icon: CircleParking,
    tile: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300",
    pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  occupied: {
    label: "Occupied",
    icon: Car,
    tile: "border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300",
    pill: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  reserved: {
    label: "Reserved",
    icon: Lock,
    tile: "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300",
    pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  disabled: {
    label: "Disabled",
    icon: Ban,
    tile: "border-border bg-muted/60 text-muted-foreground hover:bg-muted",
    pill: "bg-muted text-muted-foreground",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    tile: "border-dashed border-border bg-muted/40 text-muted-foreground hover:bg-muted/60",
    pill: "bg-muted text-muted-foreground",
  },
};

/** Display order used by the legend and any status counts. */
export const SLOT_STATUS_ORDER: SlotStatus[] = [
  "available",
  "occupied",
  "reserved",
  "disabled",
  "unknown",
];
