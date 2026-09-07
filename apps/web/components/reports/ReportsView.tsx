"use client";

import { useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/services/reports";
import { useDownloadReport, useRegenerateReport, useReportHistory } from "@/hooks/useReports";
import { REPORT_CATEGORIES, REPORT_TYPES } from "./reportConfig";
import { ReportCard } from "./ReportCard";
import { ReportGenerator } from "./ReportGenerator";
import { ReportHistory } from "./ReportHistory";
import { ReportPreview } from "./ReportPreview";
import type { ExportFormat, ReportSummary, ReportType } from "@/types/reports";

/**
 * Reports (Module 6 – Phase G) — presentation layer only.
 *
 * Composes the reusable reports sections:
 *  - Report Categories   (the backend-supported report types)
 *  - Generate Report     (request an existing report type)
 *  - Report History      (previously generated reports + actions)
 *  - Report Details      (read-only preview via `GET /reports/{id}`)
 *
 * Every value comes from the existing backend `/reports` router (PROJECT_MEMORY.md
 * §7). The frontend performs no report generation, formatting, or storage of its
 * own — only View / Download / Regenerate, which are the actions the backend
 * exposes. Delete is intentionally omitted (no delete endpoint exists).
 */
export function ReportsView() {
  const [selectedType, setSelectedType] = useState<ReportType>(
    REPORT_TYPES[0] ?? "parking_summary"
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [regenTarget, setRegenTarget] = useState<ReportSummary | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: reports = [], isLoading, isError, refetch } = useReportHistory();
  const regenerate = useRegenerateReport();
  const download = useDownloadReport();

  const handleView = (report: ReportSummary) => {
    setPreviewId(report.id);
    setPreviewOpen(true);
  };

  const handleDownload = async (report: ReportSummary, format: ExportFormat) => {
    setDownloadingId(report.id);
    try {
      await download.mutateAsync({ reportId: report.id, format });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRegenerate = (report: ReportSummary) => {
    setRegenTarget(report);
    setRegenError(null);
  };

  const handleConfirmRegenerate = async () => {
    if (!regenTarget) return;
    try {
      await regenerate.mutateAsync({
        reportId: regenTarget.id,
        type: regenTarget.type,
      });
      setRegenTarget(null);
      setRegenError(null);
    } catch (e) {
      setRegenError(getErrorMessage(e));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon={FileText}
        title="Reports"
        subtitle="Generate, view, and download audit reports from canonical facility data"
        badge={
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {reports.length} Reports Logged
          </span>
        }
        rightSlot={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            aria-label="Refresh reports"
            className="gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* ── Report Categories ── */}
      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-3 text-sm font-semibold text-foreground">
          Report Categories
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_CATEGORIES.map(category => (
            <ReportCard
              key={category.type}
              type={category.type}
              selected={selectedType === category.type}
              onSelect={setSelectedType}
            />
          ))}
        </div>
      </section>

      {/* ── Generate + About ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReportGenerator
            selectedType={selectedType}
            onSelectedTypeChange={setSelectedType}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>About Reports</CardTitle>
            <CardDescription>How exports work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Each generated report is stored and can be viewed, downloaded as JSON /
              CSV / PDF, or regenerated against the latest data.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium text-foreground">JSON</span> — full structured payload.
              </li>
              <li>
                <span className="font-medium text-foreground">CSV</span> — tabular data for spreadsheets.
              </li>
              <li>
                <span className="font-medium text-foreground">PDF</span> — print-ready summary document.
              </li>
            </ul>
            <p>
              Report data is produced entirely by the backend — the browser only
              requests and displays it.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Report History ── */}
      <ReportHistory
        reports={reports}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onView={handleView}
        onDownload={handleDownload}
        onRegenerate={handleRegenerate}
        downloadingId={downloadingId}
        regeneratingId={regenerate.isPending ? regenTarget?.id ?? null : null}
      />

      {/* ── Report Details (preview) ── */}
      <ReportPreview
        reportId={previewId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* ── Confirm regenerate ── */}
      <Dialog
        open={!!regenTarget}
        onOpenChange={open => {
          if (!open) {
            setRegenTarget(null);
            setRegenError(null);
          }
        }}
        title="Regenerate report"
        description={
          regenTarget
            ? `Regenerate "${REPORT_CATEGORIES.find(c => c.type === regenTarget.type)?.title ?? regenTarget.type}" (${regenTarget.id}) in place. The previous file will be replaced.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRegenTarget(null);
                setRegenError(null);
              }}
              disabled={regenerate.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRegenerate} disabled={regenerate.isPending}>
              {regenerate.isPending ? "Regenerating…" : "Regenerate"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Regenerating re-runs the report against the latest data. This action cannot
            be undone.
          </p>
          {regenError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {regenError}
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
