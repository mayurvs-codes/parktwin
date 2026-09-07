import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiTileItem {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  icon?: LucideIcon;
  trend?: {
    direction: "up" | "down" | "neutral";
    label: string;
  };
}

export interface KpiStripProps {
  items: KpiTileItem[];
  className?: string;
}

const TONE_MAP = {
  default: "text-foreground",
  success: "text-emerald-500 dark:text-emerald-400",
  warning: "text-amber-500 dark:text-amber-400",
  destructive: "text-rose-500 dark:text-rose-400",
  info: "text-sky-500 dark:text-sky-400",
};

export function KpiStrip({ items, className }: KpiStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4",
        className
      )}
      role="list"
      aria-label="Key performance indicators"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const toneClass = TONE_MAP[item.tone || "default"];

        return (
          <div
            key={item.key}
            role="listitem"
            className="flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-sm transition-colors hover:border-border"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
              {Icon && (
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold font-mono tracking-tight", toneClass)}>
                {item.value}
              </span>
              {item.trend && (
                <span
                  className={cn(
                    "text-[11px] font-mono",
                    item.trend.direction === "up" && "text-emerald-500",
                    item.trend.direction === "down" && "text-rose-500",
                    item.trend.direction === "neutral" && "text-muted-foreground"
                  )}
                >
                  {item.trend.direction === "up" ? "↑" : item.trend.direction === "down" ? "↓" : "→"}{" "}
                  {item.trend.label}
                </span>
              )}
            </div>

            {item.hint && (
              <p className="mt-1 text-[11px] text-muted-foreground truncate">
                {item.hint}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
