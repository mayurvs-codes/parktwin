import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/ReportsView";

export const metadata: Metadata = {
  title: "Reports",
  description: "Generate, view, download, and manage parking reports.",
};

/**
 * Reports (Module 6 – Phase G).
 *
 * Presentation layer only — all report data is produced by the backend
 * `/reports` router and surfaced through `ReportsView`. No business logic
 * or report-generation runs here (see PROJECT_MEMORY.md).
 */
export default function ReportsPage() {
  return <ReportsView />;
}
