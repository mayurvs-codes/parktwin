import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SLOT_STATUS_CONFIG } from "@/components/parking/slotStatus";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { ParkingSlotView } from "@/types/parking";

export interface TwinSlotPopoverProps {
  slotView: ParkingSlotView | null;
  onClose: () => void;
}

export function TwinSlotPopover({ slotView, onClose }: TwinSlotPopoverProps) {
  if (!slotView) return null;

  const { slot, status, plate, vehicleType, session } = slotView;
  const cfg = SLOT_STATUS_CONFIG[status];
  const Icon = cfg.icon;

  const entryTime = session?.entry_time ? formatDateTime(session.entry_time) : "—";
  const duration =
    session?.duration_seconds != null ? formatDuration(session.duration_seconds) : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in-0">
      <Card className="relative w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <span>Slot {slot.slot_id}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${cfg.pill}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {cfg.label}
            </span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close detail dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 text-sm">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/40 p-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Zone</p>
              <p className="font-semibold text-foreground">{slot.zone || "A"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Camera ID</p>
              <p className="font-semibold text-foreground">{slot.camera_id || "CAM-001"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">License Plate</span>
              <span className="font-medium text-foreground">{plate || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Vehicle Type</span>
              <span className="font-medium text-foreground">{vehicleType || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Entry Time</span>
              <span className="font-medium text-foreground">{entryTime}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-muted-foreground">Parking Duration</span>
              <span className="font-medium text-foreground">{duration}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
