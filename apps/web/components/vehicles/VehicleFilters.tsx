"use client";

import { Select } from "@/components/ui/select";
import type { VehicleStatus } from "@/types/vehicles";

export interface VehicleFiltersProps {
  status: VehicleStatus | "all";
  onStatusChange: (value: VehicleStatus | "all") => void;
  vehicleType: string | "all";
  onVehicleTypeChange: (value: string | "all") => void;
  /** Distinct vehicle types present in the current result set. */
  vehicleTypes: string[];
}

/**
 * Status and vehicle-type filters. These are presentation-only client filters
 * (the gateway vehicles endpoint exposes no status/type query params); the
 * available type options are derived from the loaded data.
 */
export function VehicleFilters({
  status,
  onStatusChange,
  vehicleType,
  onVehicleTypeChange,
  vehicleTypes,
}: VehicleFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as VehicleStatus | "all")}
        aria-label="Filter by status"
        className="sm:w-40"
      >
        <option value="all">All statuses</option>
        <option value="parked">Parked</option>
        <option value="exited">Exited</option>
        <option value="unknown">Unknown</option>
      </Select>
      <Select
        value={vehicleType}
        onChange={(e) => onVehicleTypeChange(e.target.value as string | "all")}
        aria-label="Filter by vehicle type"
        className="sm:w-44"
      >
        <option value="all">All types</option>
        {vehicleTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
    </div>
  );
}
