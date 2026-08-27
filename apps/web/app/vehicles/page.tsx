import type { Metadata } from "next";
import { VehiclesView } from "@/components/vehicles/VehiclesView";

export const metadata: Metadata = {
  title: "Vehicles",
  description: "Operational vehicle management.",
};

/**
 * Vehicles (Module 6 – Phase E).
 *
 * Presentation-only page: renders the vehicle management view composed of
 * reusable sections (search, filters, sortable table, detail dialog, history).
 * All data comes from the existing backend `/integration` gateway via TanStack
 * Query; no business logic lives here.
 */
export default function VehiclesPage() {
  return <VehiclesView />;
}
