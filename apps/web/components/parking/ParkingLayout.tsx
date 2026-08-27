"use client";

import { useMemo } from "react";
import type { ParkingSlotView } from "@/types/parking";
import { ParkingSlot } from "./ParkingSlot";

export interface ParkingLayoutProps {
  views: ParkingSlotView[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
}

interface SlotGroup {
  key: string;
  cameraId: string;
  zone: string;
  items: ParkingSlotView[];
}

/**
 * Responsive, configuration-driven parking layout.
 *
 * Slots are grouped by `camera_id` then `zone` (both come from the backend),
 * so the visualization adapts to any parking configuration without hardcoded
 * geometry. Each group is a labeled "lot area" containing a responsive grid of
 * clearly-separated slot tiles. When the backend supplies `position` metadata
 * a future layout variant can reuse the same `views` — the data contract is
 * geometry-agnostic.
 */
export function ParkingLayout({ views, selectedSlotId, onSelect }: ParkingLayoutProps) {
  const groups = useMemo<SlotGroup[]>(() => {
    const map = new Map<string, SlotGroup>();
    for (const view of views) {
      const cameraId = view.slot.camera_id || "unknown";
      const zone = view.slot.zone || "general";
      const key = `${cameraId}::${zone}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(view);
      } else {
        map.set(key, { key, cameraId, zone, items: [view] });
      }
    }
    const result = Array.from(map.values());
    result.sort((a, b) => a.key.localeCompare(b.key));
    for (const group of result) {
      group.items.sort((a, b) => a.slot.slot_id.localeCompare(b.slot.slot_id));
    }
    return result;
  }, [views]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section
          key={group.key}
          aria-label={`Parking area ${group.cameraId} — ${group.zone}`}
          className="rounded-lg border border-border bg-card/40 p-4"
        >
          <header className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              <span className="text-muted-foreground">{group.cameraId}</span>
              <span className="mx-2 text-border">/</span>
              {group.zone}
            </h3>
            <span className="text-xs text-muted-foreground">{group.items.length} slots</span>
          </header>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {group.items.map((view) => (
              <ParkingSlot
                key={view.slot.slot_id}
                view={view}
                selected={selectedSlotId === view.slot.slot_id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
