import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Historical insights and operational metrics for the Smart Parking System.",
};

/**
 * Analytics (Module 6 – Phase F).
 *
 * Presentation layer only — all metrics are produced by the backend
 * `/analytics` router and surfaced through `AnalyticsView`. No business logic
 * or analytics calculations run here (see PROJECT_MEMORY.md).
 */
export default function AnalyticsPage() {
  return <AnalyticsView />;
}
