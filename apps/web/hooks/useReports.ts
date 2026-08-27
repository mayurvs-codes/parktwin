"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchReportDetail,
  fetchReportHistory,
  fetchReports,
  generateReport,
  triggerDownload,
} from "@/services/reports";
import type { ExportFormat, GenerateRequest, ReportType } from "@/types/reports";

/**
 * TanStack Query hooks for Reports (Module 6 – Phase G).
 *
 * History + detail are read queries over the backend `/reports` router. Generation
 * and download are mutations. No report logic happens here — only transport and
 * standard loading/error/data state. On a successful (re)generation the history
 * and list caches are invalidated so the table reflects the new report.
 */

export const reportsKeys = {
  all: ["reports"] as const,
  list: (type?: string) => [...reportsKeys.all, "list", type ?? "all"] as const,
  history: (type?: string) => [...reportsKeys.all, "history", type ?? "all"] as const,
  detail: (id: string) => [...reportsKeys.all, "detail", id] as const,
};

/** List of stored reports (metadata). */
export function useReportsList(reportType?: string) {
  return useQuery({
    queryKey: reportsKeys.list(reportType),
    queryFn: () => fetchReports(reportType),
  });
}

/** Full report generation history, newest first. */
export function useReportHistory(reportType?: string) {
  return useQuery({
    queryKey: reportsKeys.history(reportType),
    queryFn: () => fetchReportHistory(reportType),
  });
}

/** One report, including its stored content (for the preview dialog). */
export function useReportDetail(reportId: string | null) {
  return useQuery({
    queryKey: reportsKeys.detail(reportId ?? ""),
    queryFn: () => fetchReportDetail(reportId as string),
    enabled: !!reportId,
  });
}

/** Generate a brand-new report. */
export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: GenerateRequest) => generateReport(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportsKeys.list() });
      qc.invalidateQueries({ queryKey: reportsKeys.history() });
    },
  });
}

/** Regenerate an existing report in place (backend supports `report_id`). */
export function useRegenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      type,
      formats,
    }: {
      reportId: string;
      type: ReportType;
      formats?: ExportFormat[];
    }) =>
      generateReport({
        report_type: type,
        formats: formats ?? ["json"],
        report_id: reportId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportsKeys.history() });
      qc.invalidateQueries({ queryKey: reportsKeys.list() });
    },
  });
}

/** Download a report file (browser save dialog). */
export function useDownloadReport() {
  return useMutation({
    mutationFn: ({ reportId, format }: { reportId: string; format?: ExportFormat }) =>
      triggerDownload(reportId, format),
  });
}
