"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimeRangeSelection {
  label: string;
  start: Date;
  end: Date;
  key?: "today" | "7d" | "30d" | "custom";
}

export type TimeRangeKey = "today" | "7d" | "30d" | "custom";

const PRESETS: Array<{ key: TimeRangeKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "custom", label: "Custom Range" },
];

export function getDatesForRangeKey(
  key: TimeRangeKey,
  customFrom?: string,
  customTo?: string
): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (key === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { label: "Today", start, end: now };
  }
  if (key === "7d") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { label: "Last 7 Days", start, end: now };
  }
  if (key === "30d") {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { label: "Last 30 Days", start, end: now };
  }
  // Custom
  const start = customFrom ? new Date(`${customFrom}T00:00:00`) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const end = customTo ? new Date(`${customTo}T23:59:59`) : now;
  return { label: "Custom Range", start, end };
}

function formatDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface TimeRangeSelectorProps {
  value: TimeRangeSelection;
  onChange: (selection: TimeRangeSelection) => void;
  className?: string;
}

/** Segmented control and custom date pickers for choosing analytics time window. */
export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  const activeKey: TimeRangeKey = value.key ?? "7d";
  const [fromStr, setFromStr] = useState<string>(formatDateInput(value.start));
  const [toStr, setToStr] = useState<string>(formatDateInput(value.end));

  const handlePresetSelect = (key: TimeRangeKey) => {
    if (key === "custom") {
      const { start, end } = getDatesForRangeKey("custom", fromStr, toStr);
      onChange({ label: "Custom Range", start, end, key: "custom" });
    } else {
      const { label, start, end } = getDatesForRangeKey(key);
      onChange({ label, start, end, key });
    }
  };

  const handleFromChange = (newFrom: string) => {
    setFromStr(newFrom);
    const { start, end } = getDatesForRangeKey("custom", newFrom, toStr);
    onChange({ label: "Custom Range", start, end, key: "custom" });
  };

  const handleToChange = (newTo: string) => {
    setToStr(newTo);
    const { start, end } = getDatesForRangeKey("custom", fromStr, newTo);
    onChange({ label: "Custom Range", start, end, key: "custom" });
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="group"
        aria-label="Select time range"
        className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
      >
        {PRESETS.map((preset) => {
          const active = activeKey === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={active}
              onClick={() => handlePresetSelect(preset.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {activeKey === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            From
            <input
              type="date"
              value={fromStr}
              max={toStr || undefined}
              onChange={(e) => handleFromChange(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Custom range start date"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            To
            <input
              type="date"
              value={toStr}
              min={fromStr || undefined}
              onChange={(e) => handleToChange(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Custom range end date"
            />
          </label>
        </div>
      )}

      {activeKey === "custom" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          Filtering analytics server-side for selected range.
        </p>
      )}
    </div>
  );
}
