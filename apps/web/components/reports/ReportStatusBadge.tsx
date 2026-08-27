import { Badge } from "@/components/ui/badge";
import { resolveStatusConfig } from "./reportConfig";

interface ReportStatusBadgeProps {
  status: string;
  className?: string;
}

/** Accessible status pill for a report (generated / regenerating / failed). */
export function ReportStatusBadge({ status, className }: ReportStatusBadgeProps) {
  const cfg = resolveStatusConfig(status);
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}
