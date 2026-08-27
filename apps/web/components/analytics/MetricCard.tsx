import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Generic, reusable metric tile for the Analytics module (Module 6 – Phase F).
 *
 * Presentational only — the `value` is pre-formatted by the caller (backend
 * provided). The component never computes a metric. Kept generic so it can
 * surface any summary statistic, not just the dashboard's KPI vocabulary.
 */

export type MetricTone = "default" | "success" | "warning" | "destructive" | "info";

const TONE_CLASSES: Record<MetricTone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: MetricTone;
  /** Optional footer (e.g. a sub-breakdown or sparkline). */
  footer?: ReactNode;
}

export function MetricCard({ label, value, hint, icon: Icon, tone = "default", footer }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p
            className="text-2xl font-semibold tracking-tight text-foreground tabular-nums"
            aria-label={`${label}: ${value}`}
          >
            {value}
          </p>
          {hint && <p className="truncate text-xs text-muted-foreground/80">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("shrink-0 rounded-full p-2.5", TONE_CLASSES[tone])} aria-hidden>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
