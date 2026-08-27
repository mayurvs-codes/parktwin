import type { LucideIcon } from "lucide-react";
import { Activity, Car, CircleParking, LayoutGrid, Percent, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiIconName, KpiItem } from "@/types/dashboard";

const ICONS: Record<KpiIconName, LucideIcon> = {
  slots: LayoutGrid,
  occupied: Car,
  available: CircleParking,
  sessions: Activity,
  vehicles: Users,
  percent: Percent,
};

const TONE_CLASSES: Record<NonNullable<KpiItem["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  destructive: "bg-destructive/15 text-destructive",
};

/**
 * Single KPI tile (presentational, reusable). Renders an icon, label, value,
 * and optional hint. The value is pre-formatted by the caller — this component
 * never computes metrics.
 */
export function KpiCard({ item }: { item: KpiItem }) {
  const Icon = ICONS[item.icon];
  const tone = item.tone ?? "default";
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{item.label}</p>
          <p
            className="text-2xl font-semibold tracking-tight text-foreground tabular-nums"
            aria-label={`${item.label}: ${item.value}`}
          >
            {item.value}
          </p>
          {item.hint && <p className="truncate text-xs text-muted-foreground/80">{item.hint}</p>}
        </div>
        <span className={cn("shrink-0 rounded-full p-2.5", TONE_CLASSES[tone])} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
