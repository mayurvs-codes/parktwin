import axios, { type AxiosError } from "axios";
import { apiClient, apiGet, apiPost } from "@/services/api-client";
import type {
  ExportFormat,
  GenerateRequest,
  GenerateResponse,
  ReportDetail,
  ReportSummary,
} from "@/types/reports";

/**
 * Reports data layer. Thin, typed wrappers over the backend **`/reports`**
 * router (PROJECT_MEMORY.md §7). No business logic — every report's data
 * is produced by the backend `ReportingService`; the frontend only transports
 * and presents it.
 *
 * The frontend is a **presentation layer only** (Phase G): it requests
 * existing report types, lists history, and views/downloads/regenerates reports.
 * It does NOT generate reports itself and adds no endpoints.
 */

/** List stored reports (metadata only). */
export function fetchReports(
  reportType?: string,
  limit = 100
): Promise<ReportSummary[]> {
  return apiGet<ReportSummary[]>("/reports", {
    params: { ...(reportType ? { report_type: reportType } : {}), limit },
  });
}

/** Full generation history, newest first. */
export function fetchReportHistory(
  reportType?: string,
  limit = 500
): Promise<ReportSummary[]> {
  return apiGet<ReportSummary[]>("/reports/history", {
    params: { ...(reportType ? { report_type: reportType } : {}), limit },
  });
}

/** Generate (or regenerate) a report and persist it. */
export function generateReport(params: GenerateRequest): Promise<GenerateResponse> {
  return apiPost<GenerateResponse>("/reports/generate", params);
}

/** Fetch one report, including its stored content. */
export function fetchReportDetail(reportId: string): Promise<ReportDetail> {
  return apiGet<ReportDetail>(`/reports/${reportId}`);
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
  media: string;
}

/** Fetch a report file as a Blob (for in-browser download). */
export async function downloadReportBlob(
  reportId: string,
  format?: ExportFormat
): Promise<DownloadResult> {
  const res = await apiClient.get<Blob>("/reports/download", {
    params: { report_id: reportId, ...(format ? { format } : {}) },
    responseType: "blob",
  });
  const blob = res.data;
  const rawMedia = res.headers["content-type"];
  const media = typeof rawMedia === "string" ? rawMedia : "application/octet-stream";
  const rawDisp = res.headers["content-disposition"];
  const disposition = typeof rawDisp === "string" ? rawDisp : "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? `report-${reportId}.${format ?? "bin"}`;
  return { blob, filename, media };
}

/** Trigger a browser download for a report in the given format. */
export async function triggerDownload(
  reportId: string,
  format?: ExportFormat
): Promise<void> {
  const { blob, filename } = await downloadReportBlob(reportId, format);
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Extract a human-readable message from an unknown error (e.g. an Axios error). */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = (error as AxiosError<{ detail?: string }>).response?.data;
    if (data?.detail) return data.detail;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
