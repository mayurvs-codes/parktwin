"use client";

import { useMemo, useState } from "react";
import { Car, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useVehicles } from "@/hooks/useVehicles";
import type {
  SortDirection,
  VehicleRowView,
  VehicleSortColumn,
  VehicleStatus,
} from "@/types/vehicles";
import { VehicleDetailDialog } from "./VehicleDetailDialog";
import { VehicleFilters } from "./VehicleFilters";
import { VehicleSearch } from "./VehicleSearch";
import { VehicleTable } from "./VehicleTable";
import { VehicleTableSkeleton } from "./VehicleSkeleton";

const PAGE_SIZE = 10;

/** Compare two vehicle views by the given sort column (ascending baseline). */
function compareViews(a: VehicleRowView, b: VehicleRowView, column: VehicleSortColumn): number {
  switch (column) {
    case "plate":
      return (a.vehicle.license_plate ?? "").localeCompare(b.vehicle.license_plate ?? "");
    case "type":
      return (a.vehicle.vehicle_type ?? "").localeCompare(b.vehicle.vehicle_type ?? "");
    case "status":
      return a.status.localeCompare(b.status);
    case "slot":
      return (a.slotId ?? "").localeCompare(b.slotId ?? "");
    case "entry":
      return (a.entryTime ?? "").localeCompare(b.entryTime ?? "");
    case "exit":
      return (a.exitTime ?? "").localeCompare(b.exitTime ?? "");
    case "duration":
      return a.durationSeconds - b.durationSeconds;
    case "confidence":
      return (a.confidence ?? 0) - (b.confidence ?? 0);
    default:
      return 0;
  }
}

/**
 * Vehicle Management (Module 6 – Phase E) — orchestrates the vehicle list.
 *
 * Presentation layer only: all data arrives from the existing backend
 * `/integration` gateway via `useVehicles`. Plate search is delegated to the
 * backend; status/type/slot filters and sorting/pagination are applied
 * client-side over the returned window. No occupancy, ownership, or duration
 * math runs here.
 */
export function VehiclesView() {
  const [plate, setPlate] = useState("");
  const [slot, setSlot] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "all">("all");
  const [vehicleType, setVehicleType] = useState<string | "all">("all");
  const [sort, setSort] = useState<{ column: VehicleSortColumn; direction: SortDirection }>({
    column: "plate",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { views, isLoading, isError, refetch } = useVehicles(plate.trim() || undefined);

  const vehicleTypes = useMemo(() => {
    const set = new Set<string>();
    for (const v of views) {
      const t = v.vehicle.vehicle_type;
      if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [views]);

  const filtered = useMemo(
    () =>
      views.filter((v) => {
        if (status !== "all" && v.status !== status) return false;
        if (vehicleType !== "all" && (v.vehicle.vehicle_type ?? "") !== vehicleType) return false;
        if (slot.trim() && !(v.slotId ?? "").toLowerCase().includes(slot.trim().toLowerCase()))
          return false;
        return true;
      }),
    [views, status, vehicleType, slot]
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const cmp = compareViews(a, b, sort.column);
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  const selectedView = useMemo(
    () =>
      views.find(
        (v) => (v.vehicle.id ?? v.vehicle.license_plate ?? null) === selectedKey
      ) ?? null,
    [views, selectedKey]
  );

  const handleSort = (column: VehicleSortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );
    setPage(1);
  };

  const hasFilters = slot.trim() !== "" || status !== "all" || vehicleType !== "all";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Car className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Vehicles</h1>
            <p className="text-sm text-muted-foreground">Operational vehicle management</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          aria-label="Refresh vehicles"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Vehicle list</CardTitle>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <VehicleSearch
              plate={plate}
              onPlateChange={(v) => {
                setPlate(v);
                setPage(1);
              }}
              slot={slot}
              onSlotChange={(v) => {
                setSlot(v);
                setPage(1);
              }}
            />
            <VehicleFilters
              status={status}
              onStatusChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              vehicleType={vehicleType}
              onVehicleTypeChange={(v) => {
                setVehicleType(v);
                setPage(1);
              }}
              vehicleTypes={vehicleTypes}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <VehicleTableSkeleton />
          ) : isError ? (
            <ErrorState
              title="Couldn't load vehicles"
              description="The vehicle data is unavailable."
              onRetry={() => refetch()}
            />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No vehicles found"
              description={
                plate.trim() || hasFilters
                  ? "Try adjusting your search or filters."
                  : "There are no vehicles reported by the backend yet."
              }
            />
          ) : (
            <>
              <VehicleTable
                rows={pageRows}
                sort={sort}
                onSort={handleSort}
                onSelect={setSelectedKey}
                selectedKey={selectedKey}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  {sorted.length} vehicle{sorted.length === 1 ? "" : "s"}
                  {hasFilters ? " (filtered)" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <span aria-live="polite">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <VehicleDetailDialog
        view={selectedView}
        open={selectedKey !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedKey(null);
        }}
      />
    </div>
  );
}
