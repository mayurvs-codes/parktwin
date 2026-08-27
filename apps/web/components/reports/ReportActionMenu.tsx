import { Download, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXPORT_FORMAT_LABELS } from "./reportConfig";
import type { ExportFormat, ReportSummary } from "@/types/reports";

interface ReportActionMenuProps {
  report: ReportSummary;
  onView: () => void;
  onDownload: (format: ExportFormat) => void;
  onRegenerate: () => void;
  downloading: boolean;
  regenerating: boolean;
}

/**
 * Backend-driven action row for a single report. Only the actions the backend
 * supports are offered:
 *  - View       → `GET /reports/{id}` (preview dialog)
 *  - Download   → `GET /reports/download` (the report's stored format)
 *  - Regenerate → `POST /reports/generate` with `report_id` (in place)
 *
 * Delete is intentionally absent — the backend `/reports` router exposes no
 * delete endpoint, so the frontend must not invent one.
 */
export function ReportActionMenu({
  report,
  onView,
  onDownload,
  onRegenerate,
  downloading,
  regenerating,
}: ReportActionMenuProps) {
  const format = report.format ?? "json";

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onView}
        aria-label={`View ${report.id}`}
      >
        <Eye className="h-4 w-4" aria-hidden />
        View
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onDownload(format)}
        disabled={downloading}
        aria-label={`Download ${report.id} as ${EXPORT_FORMAT_LABELS[format]}`}
      >
        <Download className="h-4 w-4" aria-hidden />
        {downloading ? "…" : "Download"}
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={onRegenerate}
        disabled={regenerating}
        aria-label={`Regenerate ${report.id}`}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        {regenerating ? "…" : "Regenerate"}
      </Button>
    </div>
  );
}
