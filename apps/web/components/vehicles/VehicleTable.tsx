"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDirection, VehicleRowView, VehicleSortColumn } from "@/types/vehicles";
import { VehicleRow } from "./VehicleRow";

export interface VehicleTableProps {
  rows: VehicleRowView[];
  sort: { column: VehicleSortColumn; direction: SortDirection };
  onSort: (column: VehicleSortColumn) => void;
  onSelect: (key: string) => void;
  selectedKey: string | null;
}

const COLUMNS: { key: VehicleSortColumn; label: string; className?: string }[] = [
  { key: "plate", label: "Plate" },
  { key: "type", label: "Type", className: "hidden md:table-cell" },
  { key: "status", label: "Status" },
  { key: "slot", label: "Slot", className: "hidden sm:table-cell" },
  { key: "entry", label: "Entry", className: "hidden lg:table-cell" },
  { key: "exit", label: "Exit", className: "hidden lg:table-cell" },
  { key: "duration", label: "Duration", className: "hidden md:table-cell" },
  { key: "confidence", label: "Confidence", className: "hidden md:table-cell" },
];

function SortIcon({ state }: { state: "asc" | "desc" | "none" }) {
  if (state === "asc") return <ChevronUp className="h-3.5 w-3.5" aria-hidden />;
  if (state === "desc") return <ChevronDown className="h-3.5 w-3.5" aria-hidden />;
  return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />;
}

/**
 * Responsive, sortable vehicle table. Less-critical columns collapse on smaller
 * breakpoints; the whole table scrolls horizontally inside its container when
 * space is tight. Column headers are sortable buttons exposing `aria-sort`.
 */
export function VehicleTable({
  rows,
  sort,
  onSort,
  onSelect,
  selectedKey,
}: VehicleTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">Vehicle list</caption>
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {COLUMNS.map((col) => {
              const active = sort.column === col.key;
              const ariaSort: "ascending" | "descending" | "none" = active
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none";
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    "px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    col.className
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    aria-label={`Sort by ${col.label}`}
                    className="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {col.label}
                    <SortIcon state={active ? sort.direction : "none"} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((view, i) => (
            <VehicleRow
              key={view.vehicle.id ?? view.vehicle.license_plate ?? `row-${i}`}
              view={view}
              selected={selectedKey === (view.vehicle.id ?? view.vehicle.license_plate ?? null)}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
