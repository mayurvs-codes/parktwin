"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { REPORT_TYPE_TITLES } from "./reportConfig";
import { ReportFilters } from "./ReportFilters";
import { ReportTableSkeleton as ReportSkeleton } from "./ReportSkeleton";
import { ReportTable } from "./ReportTable";
import type { ExportFormat, ReportSummary } from "@/types/reports";

interface ReportHistoryProps {
  reports: ReportSummary[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onView: (report: ReportSummary) => void;
  onDownload: (report: ReportSummary, format: ExportFormat) => void;
  onRegenerate: (report: ReportSummary) => void;
  downloadingId: string | null;
  regeneratingId: string | null;
}

/**
 * Report history section. Owns the (presentation-only) type + search filters
 * over the already-fetched history, and renders the loading / error / empty /
 * table states. The data itself comes from the backend via the parent's query.
 */
export function ReportHistory({
  reports,
  isLoading,
  isError,
  onRetry,
  onView,
  onDownload,
  onRegenerate,
  downloadingId,
  regeneratingId,
}: ReportHistoryProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter(r => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!q) return true;
      const title = REPORT_TYPE_TITLES[r.type] ?? r.type;
      return (
        r.id.toLowerCase().includes(q) || title.toLowerCase().includes(q)
      );
    });
  }, [reports, typeFilter, search]);

  const showSkeleton = isLoading && reports.length === 0;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Report History</CardTitle>
          <span className="text-sm text-muted-foreground">
            {reports.length} generated
          </span>
        </div>
        <ReportFilters
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          search={search}
          onSearchChange={setSearch}
        />
      </CardHeader>
      <CardContent>
        {showSkeleton ? (
          <ReportSkeleton />
        ) : isError && reports.length === 0 ? (
          <ErrorState
            title="Couldn't load report history"
            description="The reporting service may be unavailable."
            onRetry={onRetry}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={reports.length === 0 ? "No reports yet" : "No matching reports"}
            description={
              reports.length === 0
                ? "Generate your first report above."
                : "Try a different type or search term."
            }
          />
        ) : (
          <ReportTable
            reports={filtered}
            onView={onView}
            onDownload={onDownload}
            onRegenerate={onRegenerate}
            downloadingId={downloadingId}
            regeneratingId={regeneratingId}
          />
        )}
      </CardContent>
    </Card>
  );
}
