import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { EXPORT_FORMAT_LABELS, REPORT_TYPE_TITLES } from "./reportConfig";
import { ReportActionMenu } from "./ReportActionMenu";
import { ReportStatusBadge } from "./ReportStatusBadge";
import type { ExportFormat, ReportSummary } from "@/types/reports";

interface ReportTableProps {
  reports: ReportSummary[];
  onView: (report: ReportSummary) => void;
  onDownload: (report: ReportSummary, format: ExportFormat) => void;
  onRegenerate: (report: ReportSummary) => void;
  downloadingId: string | null;
  regeneratingId: string | null;
}

/**
 * Responsive, accessible report history table. Each row shows the report's id /
 * title, type, created time, status, stored format, and the backend-driven
 * action menu. Selection (View) is also reachable from the id cell.
 */
export function ReportTable({
  reports,
  onView,
  onDownload,
  onRegenerate,
  downloadingId,
  regeneratingId,
}: ReportTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">
              Report
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Type
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Created
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Format
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map(report => {
            const title = REPORT_TYPE_TITLES[report.type] ?? report.type;
            return (
              <tr
                key={report.id}
                className="border-b border-border last:border-0 transition-colors hover:bg-accent/50"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onView(report)}
                    className="flex flex-col items-start text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
                    aria-label={`View ${title} report ${report.id}`}
                  >
                    <span className="font-medium text-foreground">{title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{report.id}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{title}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <time dateTime={report.generated_at}>
                    {formatDateTime(report.generated_at)}
                  </time>
                </td>
                <td className="px-4 py-3">
                  <ReportStatusBadge status={report.status} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="uppercase">
                    {report.format ? EXPORT_FORMAT_LABELS[report.format] : "—"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <ReportActionMenu
                    report={report}
                    onView={() => onView(report)}
                    onDownload={format => onDownload(report, format)}
                    onRegenerate={() => onRegenerate(report)}
                    downloading={downloadingId === report.id}
                    regenerating={regeneratingId === report.id}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
