"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { formatDateTime } from "@/lib/format";
import { useReportDetail } from "@/hooks/useReports";
import { EXPORT_FORMAT_LABELS, REPORT_TYPE_TITLES, resolveStatusConfig } from "./reportConfig";
import type { ReportStatus } from "@/types/reports";

interface ReportPreviewProps {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MetaField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Read-only report preview dialog (Module 6 – Phase G).
 *
 * Backed by `GET /reports/{id}` (which returns the stored `content`), so a
 * preview is genuinely supported by the backend. Renders report metadata plus a
 * formatted view of the report payload. Nothing here is editable and no values
 * are computed on the frontend.
 */
export function ReportPreview({ reportId, open, onOpenChange }: ReportPreviewProps) {
  const id = open ? reportId : null;
  const { data, isLoading, isError, refetch } = useReportDetail(id);

  const title = data ? (REPORT_TYPE_TITLES[data.type] ?? data.type) : "Report preview";
  const statusCfg = data
    ? resolveStatusConfig(data.status as ReportStatus)
    : null;

  let contentNode: ReactNode;
  if (isLoading) {
    contentNode = (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (isError) {
    contentNode = (
      <ErrorState
        title="Couldn't load report"
        description="The report content is unavailable."
        onRetry={() => refetch()}
      />
    );
  } else if (data?.content) {
    contentNode = (
      <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
        {JSON.stringify(data.content, null, 2)}
      </pre>
    );
  } else {
    contentNode = (
      <p className="text-sm text-muted-foreground">No preview content available for this report.</p>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={data?.id ? `Report ${data.id}` : "Read-only report information."}
    >
      {data && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Details</h3>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <MetaField label="Type">
                {REPORT_TYPE_TITLES[data.type] ?? data.type}
              </MetaField>
              <MetaField label="Status">
                <Badge variant={statusCfg?.variant}>{statusCfg?.label}</Badge>
              </MetaField>
              <MetaField label="Created">
                {formatDateTime(data.generated_at)}
              </MetaField>
              <MetaField label="Format">
                {data.format ? (
                  <span className="uppercase">{EXPORT_FORMAT_LABELS[data.format]}</span>
                ) : (
                  "—"
                )}
              </MetaField>
              <MetaField label="ID">
                <span className="font-mono text-xs">{data.id}</span>
              </MetaField>
              {data.file_path && (
                <MetaField label="File">
                  <span className="truncate font-mono text-xs">{String(data.file_path)}</span>
                </MetaField>
              )}
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Content</h3>
            {contentNode}
          </section>
        </div>
      )}
    </Dialog>
  );
}
