/**
 * Presentation formatting helpers for the frontend.
 *
 * These are pure display utilities (number/percent/time formatting, date
 * predicates). They contain **no business logic** — occupancy rate, session
 * counts, and durations are computed backend-side (PROJECT_MEMORY.md §7). Keep
 * it that way: add formatting here, not domain math.
 */

/** Locale-aware integer formatting (e.g. 1234 → "1,234"). */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat().format(value);
}

/** Format a 0–100 occupancy rate (already computed backend-side) as "42.5%". */
export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) return "0%";
  return `${rate.toFixed(1)}%`;
}

/** Map a gateway ISO timestamp to a coarse "x ago" label for feeds. */
export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return sec <= 3 ? "just now" : `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/** Format a gateway ISO timestamp to a short local time (HH:MM:SS). */
export function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** True when the given ISO timestamp falls on the current local calendar day. */
export function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Format a duration in seconds as a short human string ("2h 5m", "4m 12s", "9s").
 * Pure presentation formatting — the seconds value is supplied by the backend
 * (it is never computed on the frontend).
 */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "—";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Seconds elapsed from an ISO timestamp to now (presentation only). */
export function elapsedSecondsFrom(iso?: string | null): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 1000));
}

/** Format an ISO timestamp to a localized date + time (e.g. "Jul 19, 14:32"). */
export function formatDateTime(iso?: string | null): string {
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

/**
 * Format a duration in seconds as a compact clock string ("0:00", "1:05",
 * "12:30"). Used for video timestamps / current-time readouts where the
 * `formatDuration` "Xm Ys" form is too verbose. Presentation only.
 */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Format a 0–1 confidence ratio (backend-provided) as a whole-number
 * percentage (e.g. 0.92 → "92%"). Returns an em dash when unavailable.
 * Pure presentation formatting — the value itself is never computed here.
 */
export function formatConfidence(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}
