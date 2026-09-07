import type { LucideIcon } from "lucide-react";
import { Ban, Car, CircleParking, HelpCircle, Lock } from "lucide-react";
import type { SlotStatus } from "@/types/parking";

export interface SlotStatusStyle {
  label: string;
  icon: LucideIcon;
  /** Container classes for the slot tile (border/background/text). */
  tile: string;
  /** Classes for the small status pill. */
  pill: string;
}

/**
 * Authoritative presentation colors locked for ParkTwin AI:
 * GREEN = OCCUPIED
 * RED = AVAILABLE
 */
export const SLOT_STATUS_CONFIG: Record<SlotStatus, SlotStatusStyle> = {
  occupied: {
    label: "Occupied",
    icon: Car,
    tile: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-sm shadow-emerald-950/20",
    pill: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  },
  available: {
    label: "Available",
    icon: CircleParking,
    tile: "border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25 shadow-sm shadow-red-950/20",
    pill: "bg-red-500/20 text-red-400 border border-red-500/40",
  },
  reserved: {
    label: "Reserved",
    icon: Lock,
    tile: "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
    pill: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  disabled: {
    label: "Disabled",
    icon: Ban,
    tile: "border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800/60",
    pill: "bg-slate-800 text-slate-400",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    tile: "border-dashed border-slate-700 bg-slate-800/20 text-slate-500 hover:bg-slate-800/40",
    pill: "bg-slate-800 text-slate-500",
  },
};

/** Display order used by the legend and any status counts. */
export const SLOT_STATUS_ORDER: SlotStatus[] = [
  "occupied",
  "available",
  "reserved",
  "disabled",
  "unknown",
];
