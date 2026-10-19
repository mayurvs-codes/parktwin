import React from "react";

const LEGEND_ITEMS = [
  { label: "Free", color: "#22c55e", isDashed: false },
  { label: "Occupied", color: "#ef4444", isDashed: false },
  { label: "Reserved", color: "#f59e0b", isDashed: false },
  { label: "Violation", color: "#eab308", isDashed: false },
  { label: "Unknown", color: "#64748b", isDashed: false },
  { label: "Unverified / Candidate", color: "#94a3b8", isDashed: true },
];

export function TwinLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={item.isDashed ? "h-3 w-3 rounded border border-dashed border-slate-400 bg-slate-800" : "h-3 w-3 rounded-full"}
            style={item.isDashed ? undefined : { backgroundColor: item.color }}
            aria-hidden
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
