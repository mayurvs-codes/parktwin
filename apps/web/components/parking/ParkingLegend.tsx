import { cn } from "@/lib/utils";
import { SLOT_STATUS_CONFIG, SLOT_STATUS_ORDER } from "./slotStatus";

/**
 * Legend explaining the slot-state colors used in the layout. Purely
 * presentational and driven by the shared `SLOT_STATUS_CONFIG` so it never
 * drifts from the slot tiles.
 */
export function ParkingLegend() {
  return (
    <ul
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
      role="list"
      aria-label="Slot status legend"
    >
      {SLOT_STATUS_ORDER.map((status) => {
        const cfg = SLOT_STATUS_CONFIG[status];
        const Icon = cfg.icon;
        return (
          <li key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border",
                cfg.tile
              )}
              aria-hidden
            >
              <Icon className="h-3 w-3" />
            </span>
            {cfg.label}
          </li>
        );
      })}
    </ul>
  );
}
