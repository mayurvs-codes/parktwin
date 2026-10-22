"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { formatConfidence, formatDateTime, formatDuration } from "@/lib/format";
import type { VehicleRowView } from "@/types/vehicles";
import { VehicleStatusBadge } from "./VehicleStatusBadge";
import { bayLabel } from "@/utils/bayLabel";

export interface VehicleRowProps {
  view: VehicleRowView;
  selected: boolean;
  /** Called with a stable key (vehicle id, falling back to plate) for selection. */
  onSelect: (key: string) => void;
}

/**
 * A single, interactive vehicle row. The whole row is activatable (click /
 * Enter / Space) to open the read-only detail panel. Status uses a colored
 * badge plus text so it is not conveyed by color alone.
 */
function VehicleRowComponent({ view, selected, onSelect }: VehicleRowProps) {
  const { vehicle, status, slotId, entryTime, exitTime, durationSeconds, confidence } = view;
  const plate = vehicle.license_plate ?? "—";
  const key = vehicle.id ?? plate;
  const label = `Vehicle ${plate}, status ${status}${slotId ? `, slot ${bayLabel(slotId)}` : ""}. Open details.`;

  return (
    <tr
      onClick={() => onSelect(key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(key);
        }
      }}
      tabIndex={0}
      aria-label={label}
      className={cn(
        "cursor-pointer border-b border-border transition-colors hover:bg-accent/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        selected && "bg-accent/60"
      )}
    >
      <td className="px-3 py-2 text-sm font-medium text-foreground">{plate}</td>
      <td className="hidden px-3 py-2 text-sm text-muted-foreground md:table-cell">
        {vehicle.vehicle_type ?? "—"}
      </td>
      <td className="px-3 py-2">
        <VehicleStatusBadge status={status} />
      </td>
      <td className="hidden px-3 py-2 text-sm tabular-nums text-foreground sm:table-cell">
        {slotId ? bayLabel(slotId) : "—"}
      </td>
      <td className="hidden px-3 py-2 text-sm text-muted-foreground lg:table-cell">
        {formatDateTime(entryTime)}
      </td>
      <td className="hidden px-3 py-2 text-sm text-muted-foreground lg:table-cell">
        {formatDateTime(exitTime)}
      </td>
      <td className="hidden px-3 py-2 text-sm tabular-nums text-muted-foreground md:table-cell">
        {formatDuration(durationSeconds)}
      </td>
      <td className="hidden px-3 py-2 text-sm tabular-nums text-muted-foreground md:table-cell">
        {formatConfidence(confidence)}
      </td>
    </tr>
  );
}

export const VehicleRow = memo(VehicleRowComponent);
