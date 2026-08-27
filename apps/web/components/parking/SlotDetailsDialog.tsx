"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import type { ParkingSlotView } from "@/types/parking";
import { elapsedSecondsFrom, formatDateTime, formatDuration } from "@/lib/format";
import { SLOT_STATUS_CONFIG } from "./slotStatus";

export interface SlotDetailsDialogProps {
  /** The slot to show, or `null` when nothing is selected. */
  view: ParkingSlotView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Read-only detail dialog for a selected slot. Displays only the information the
 * backend provides: slot id, occupancy status, vehicle plate, parking duration,
 * entry time, and vehicle type (when available). Nothing here is editable and
 * no values are computed on the frontend.
 */
export function SlotDetailsDialog({ view, open, onOpenChange }: SlotDetailsDialogProps) {
  const cfg = view ? SLOT_STATUS_CONFIG[view.status] : null;
  const Icon = cfg?.icon;

  const duration =
    view?.session != null
      ? formatDuration(
          view.session.duration_seconds > 0
            ? view.session.duration_seconds
            : elapsedSecondsFrom(view.session.entry_time)
        )
      : "—";

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={view ? `Slot ${view.slot.slot_id}` : "Slot details"}
      description="Read-only live parking information."
    >
      {view && cfg && Icon && (
        <dl>
          <Row label="Slot ID" value={view.slot.slot_id} />
          <Row
            label="Occupancy status"
            value={
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                  cfg.pill
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {cfg.label}
              </span>
            }
          />
          <Row label="Vehicle plate" value={view.plate ?? "—"} />
          <Row label="Vehicle type" value={view.vehicleType ?? "—"} />
          <Row label="Parking duration" value={duration} />
          <Row label="Entry time" value={formatDateTime(view.session?.entry_time ?? null)} />
        </dl>
      )}
    </Dialog>
  );
}
