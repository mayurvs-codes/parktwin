import React from "react";

const LEGEND_ITEMS = [
  { label: "Free", color: "#22c55e" },
  { label: "Occupied", color: "#ef4444" },
  { label: "Reserved", color: "#f59e0b" },
  { label: "Violation", color: "#eab308" },
  { label: "Unknown", color: "#64748b" },
];

export function TwinLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
