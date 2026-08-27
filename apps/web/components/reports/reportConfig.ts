import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Car,
  Clock,
  ParkingSquare,
  PieChart,
} from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import type { ExportFormat, ReportStatus, ReportType } from "@/types/reports";

/** Canonical Badge variant union (kept in sync with `components/ui/badge.tsx`). */
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Single source of truth for how report types are labelled/iconed/described.
 * Mirrors the backend `REPORT_TYPES` / `REPORT_TYPE_TITLES` constants
 * (modules/reporting/types.py) — the frontend never re-derives the types, it
 * only presents the ones the backend exposes.
 */
export const REPORT_TYPE_TITLES: Record<ReportType, string> = {
  parking_summary: "Parking Summary",
  occupancy: "Occupancy Report",
  vehicle: "Vehicle Report",
  parking_session: "Parking Session Report",
  violation: "Violation Report",
  analytics_summary: "Analytics Summary",
};

export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  parking_summary: "End-to-end snapshot of the parking system.",
  occupancy: "Slot occupancy and utilization over time.",
  vehicle: "Per-vehicle recognitions and history.",
  parking_session: "Parking sessions, durations, and entries/exits.",
  violation: "Detected parking violations and events.",
  analytics_summary: "Aggregated analytics insights and trends.",
};

export const REPORT_TYPE_ICONS: Record<ReportType, LucideIcon> = {
  parking_summary: ParkingSquare,
  occupancy: BarChart3,
  vehicle: Car,
  parking_session: Clock,
  violation: AlertTriangle,
  analytics_summary: PieChart,
};

/** All report types the backend supports, in display order. */
export const REPORT_TYPES: ReportType[] = [
  "parking_summary",
  "occupancy",
  "vehicle",
  "parking_session",
  "violation",
  "analytics_summary",
];

export interface ReportCategory {
  type: ReportType;
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Categories surfaced in the "Report Categories" section. */
export const REPORT_CATEGORIES: ReportCategory[] = REPORT_TYPES.map((type) => ({
  type,
  title: REPORT_TYPE_TITLES[type],
  description: REPORT_TYPE_DESCRIPTIONS[type],
  icon: REPORT_TYPE_ICONS[type],
}));

/** Export formats the backend can render (modules/reporting/types.py). */
export const EXPORT_FORMATS: ExportFormat[] = ["json", "csv", "pdf"];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  json: "JSON",
  csv: "CSV",
  pdf: "PDF",
};

/** How each report lifecycle status is rendered. */
export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; variant: BadgeVariant }
> = {
  generated: { label: "Generated", variant: "success" },
  regenerating: { label: "Regenerating", variant: "warning" },
  failed: { label: "Failed", variant: "destructive" },
};

/** Resolve a (possibly unknown) status string to a render-safe config. */
export function resolveStatusConfig(
  status: string
): { label: string; variant: BadgeVariant } {
  return (
    REPORT_STATUS_CONFIG[status as ReportStatus] ?? {
      label: status || "Unknown",
      variant: "outline",
    }
  );
}
