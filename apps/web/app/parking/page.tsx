import type { Metadata } from "next";
import { LiveParkingView } from "@/components/parking/LiveParkingView";

export const metadata: Metadata = {
  title: "Live Parking",
  description: "Real-time visualization of parking lot occupancy.",
};

/**
 * Live Parking (Module 6 – Phase D).
 *
 * Presentation-only page: renders the real-time parking visualization composed
 * of reusable sections (summary, layout, legend, detail dialog). All data comes
 * from the existing backend `/integration` gateway via TanStack Query; no
 * business logic lives here.
 */
export default function ParkingPage() {
  return <LiveParkingView />;
}
