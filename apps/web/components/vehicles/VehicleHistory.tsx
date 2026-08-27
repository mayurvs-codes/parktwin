"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { SessionDTO } from "@/types/parking";

export interface VehicleHistoryProps {
  /** All sessions for the vehicle (active + historical), from the backend. */
  sessions: SessionDTO[];
}

/**
 * Session history list for a vehicle. If the backend exposes no sessions for
 * the plate, a graceful "unavailable" message is shown (no fabricated data).
 */
export function VehicleHistory({ sessions }: VehicleHistoryProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No historical sessions available for this vehicle.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border" role="list">
      {sessions.map((s, i) => {
        const key = s.session_uid ?? `session-${i}`;
        return (
          <li
            key={key}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">Slot {s.slot_id ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(s.entry_time)} → {formatDateTime(s.exit_time)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDuration(s.duration_seconds > 0 ? s.duration_seconds : 0)}
              </span>
              <Badge variant={s.is_active ? "success" : "secondary"}>
                {s.is_active ? "Active" : "Ended"}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
