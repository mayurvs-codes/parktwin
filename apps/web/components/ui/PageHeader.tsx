import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  rightSlot,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightSlot && (
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {rightSlot}
        </div>
      )}
    </header>
  );
}
