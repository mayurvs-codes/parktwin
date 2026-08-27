import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { AlertItem, AlertSeverity } from "@/types/dashboard";

const SEVERITY: Record<
  AlertSeverity,
  { icon: LucideIcon; container: string; iconColor: string; label: string }
> = {
  info: {
    icon: Info,
    container: "border-l-blue-500/60 bg-blue-500/5",
    iconColor: "text-blue-500",
    label: "Info",
  },
  success: {
    icon: CheckCircle2,
    container: "border-l-emerald-500/60 bg-emerald-500/5",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    label: "OK",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-l-amber-500/60 bg-amber-500/5",
    iconColor: "text-amber-600 dark:text-amber-400",
    label: "Warning",
  },
  destructive: {
    icon: AlertCircle,
    container: "border-l-destructive/60 bg-destructive/5",
    iconColor: "text-destructive",
    label: "Critical",
  },
};

/**
 * Reusable, data-driven alert row. Knows nothing about where its data comes
 * from — pass `AlertItem`s and it renders. Designed to display placeholder
 * alerts until the backend exposes a dedicated alert feed (see AlertsPanel).
 */
export function Alert({ item }: { item: AlertItem }) {
  const cfg = SEVERITY[item.severity];
  const Icon = cfg.icon;
  return (
    <li className={cn("flex items-start gap-3 rounded-md border-l-4 p-3", cfg.container)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", cfg.iconColor)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.message}</p>
      </div>
      <span className="sr-only">{cfg.label}</span>
    </li>
  );
}
