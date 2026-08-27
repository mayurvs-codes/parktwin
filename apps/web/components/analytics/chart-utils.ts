/**
 * Presentation helpers for the Analytics charts (Module 6 – Phase F).
 *
 * IMPORTANT: these helpers contain **no analytics math**. They only format
 * already-computed backend values for display and window/filter returned
 * series by a selected time range (a view operation, not an aggregation).
 * Rates, counts, distributions, and percentiles are all produced by the
 * backend Analytics Engine.
 */

import type { OccupancyTimelinePoint } from "@/types/analytics";

/** Compact axis label from a backend ISO timestamp ("Jul 19, 14:30"). */
export function formatAxisTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short time-only label ("14:30") for dense axes. */
export function formatAxisHour(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Format an hour-of-day integer (0–23) as "14:00"; `null` → "—". */
export function formatHour(hour: number | null | undefined): string {
  if (hour == null) return "—";
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Reshape the backend's full 24-hour frame into a sorted bar-chart series. */
export function hourlyToChartData(
  hourly: Record<string, number>
): Array<{ hour: string; entries: number }> {
  return Array.from({ length: 24 }, (_, h) => {
    const val = hourly[String(h)] ?? hourly[h as unknown as string] ?? 0;
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      entries: Number(val),
    };
  });
}

/**
 * Window a returned timeline to a selected time range. Pure filtering over
 * fetched data — no aggregation or rate computation. `custom` uses inclusive
 * from/to ISO dates supplied by the UI.
 */
export function filterTimelineByRange<T extends { timestamp: string }>(
  points: ReadonlyArray<T>,
  range: { key: "today" | "7d" | "30d" | "custom"; from?: string; to?: string }
): T[] {
  if (range.key === "custom") {
    const from = range.from ? new Date(range.from).getTime() : -Infinity;
    const to = range.to ? new Date(range.to).getTime() : Infinity;
    return points.filter((p) => {
      const t = new Date(p.timestamp).getTime();
      return t >= from && t <= to;
    });
  }

  const now = Date.now();
  const windowMs =
    range.key === "today"
      ? now - startOfToday()
      : range.key === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  const cutoff = range.key === "today" ? startOfToday() : now - windowMs;

  return points.filter((p) => new Date(p.timestamp).getTime() >= cutoff);
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Select the peak occupancy point from a returned timeline. This only picks
 * the maximum of values the backend already computed per-snapshot — it does
 * NOT compute occupancy analytics. Returns `null` when there is no data.
 */
export function peakFromTimeline(
  points: ReadonlyArray<OccupancyTimelinePoint>
): OccupancyTimelinePoint | null {
  if (points.length === 0) return null;
  return points.reduce((best, p) =>
    p.occupancy_percentage > best.occupancy_percentage ? p : best
  );
}
