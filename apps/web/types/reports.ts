/**
 * Report types + DTOs for the Reports module (Module 6 – Phase G).
 *
 * These mirror the backend Reporting Engine (`/reports` router, PROJECT_MEMORY.md §7).
 * The frontend is a **presentation layer only** — it never computes or stores
 * report data; it transports and displays values produced by the backend
 * `ReportingService`. Keep these as pure projections of the API shapes.
 */

/** Report types the backend Reporting Engine can produce. */
export type ReportType =
  | "parking_summary"
  | "occupancy"
  | "vehicle"
  | "parking_session"
  | "violation"
  | "analytics_summary";

/** Export formats the backend can render on demand. */
export type ExportFormat = "json" | "csv" | "pdf";

/** Lifecycle status of a stored report. */
export type ReportStatus = "generated" | "regenerating" | "failed";

/** Metadata-only summary returned by `/reports` and `/reports/history`. */
export interface ReportSummary {
  id: string;
  type: ReportType;
  generated_at: string;
  status: ReportStatus;
  file_path?: string | null;
  format?: ExportFormat | null;
}

/** Request body for `POST /reports/generate`. */
export interface GenerateRequest {
  report_type: ReportType;
  formats: ExportFormat[];
  params?: Record<string, unknown> | null;
  report_id?: string | null;
}

/** Response from `POST /reports/generate`. */
export interface GenerateResponse {
  id: string;
  type: ReportType;
  status: ReportStatus;
  generated_at: string;
  format?: ExportFormat | null;
  file_path?: string | null;
  formats: ExportFormat[];
  download_url: string;
}

/** Full report (incl. stored content) returned by `GET /reports/{id}`. */
export interface ReportDetail extends ReportSummary {
  meta: Record<string, unknown>;
  content?: Record<string, unknown> | null;
}
