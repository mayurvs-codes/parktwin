import { Badge } from "@/components/ui/badge";
import type { VehicleStatus } from "@/types/vehicles";

/** Single source of truth for how each derived vehicle status is rendered. */
const CONFIG: Record<
  VehicleStatus,
  { label: string; variant: "success" | "secondary" | "outline" }
> = {
  parked: { label: "Parked", variant: "success" },
  exited: { label: "Exited", variant: "secondary" },
  unknown: { label: "Unknown", variant: "outline" },
};

/** Accessible status pill for a vehicle (parked / exited / unknown). */
export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const cfg = CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
