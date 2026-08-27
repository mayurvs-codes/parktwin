import { cn } from "@/lib/utils";
import {
  REPORT_TYPE_DESCRIPTIONS,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_TITLES,
} from "./reportConfig";
import type { ReportType } from "@/types/reports";

interface ReportCardProps {
  type: ReportType;
  selected?: boolean;
  onSelect?: (type: ReportType) => void;
}

/**
 * A single report-type "category" tile. Selecting it drives the generator's
 * chosen type. Keyboard accessible (native `<button>` + `aria-pressed`).
 */
export function ReportCard({ type, selected, onSelect }: ReportCardProps) {
  const Icon = REPORT_TYPE_ICONS[type];
  const title = REPORT_TYPE_TITLES[type];
  const description = REPORT_TYPE_DESCRIPTIONS[type];

  return (
    <button
      type="button"
      onClick={() => onSelect?.(type)}
      aria-pressed={selected}
      aria-label={`Select ${title} report type`}
      className={cn(
        "group flex w-full flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          selected
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
