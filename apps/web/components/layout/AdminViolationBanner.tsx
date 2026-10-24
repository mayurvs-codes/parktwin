"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { bayLabel } from "@/utils/bayLabel";

/**
 * Admin notification shown on every admin page when a driver was warned but has not moved
 * (raised 5 s after the call in the demo timeline). Clears when the car moves or the demo resets.
 */
export function AdminViolationBanner() {
  const violation = useSharedDemoState((s) => s.violation);
  if (!violation?.active || !violation.notMoved) return null;

  return (
    <div
      data-testid="admin-not-moved-banner"
      role="alert"
      className="flex items-center gap-3 border-b border-red-500/60 bg-red-950/80 px-4 py-2 text-xs font-mono text-red-100"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse text-red-400" />
      <span className="font-bold uppercase tracking-wider text-red-300">Admin notification</span>
      <span className="min-w-0 flex-1 truncate">
        {violation.vehicleId} ({violation.plate}) has not moved from bay {bayLabel(violation.actualSpaceId)} after the
        warning. Expected bay {bayLabel(violation.designatedSpaceId)}.
      </span>
      <Link href="/digital-twin" className="shrink-0 rounded border border-red-400/60 px-2 py-0.5 font-bold text-red-100 hover:bg-red-500/20">
        View on twin
      </Link>
    </div>
  );
}
