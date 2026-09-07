import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusDotVariant =
  | "live"
  | "success"
  | "warning"
  | "error"
  | "idle"
  | "configured"
  | "unconfigured"
  | "online"
  | "offline"
  | "unknown";

export interface StatusDotProps {
  variant?: StatusDotVariant;
  status?: StatusDotVariant;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const VARIANT_MAP: Record<StatusDotVariant, { bg: string; pulse?: boolean }> = {
  live: { bg: "bg-emerald-500", pulse: true },
  success: { bg: "bg-emerald-500", pulse: false },
  warning: { bg: "bg-amber-500", pulse: false },
  error: { bg: "bg-rose-500", pulse: false },
  idle: { bg: "bg-slate-500", pulse: false },
  configured: { bg: "bg-emerald-400", pulse: false },
  unconfigured: { bg: "bg-slate-600", pulse: false },
  online: { bg: "bg-emerald-500", pulse: false },
  offline: { bg: "bg-slate-500", pulse: false },
  unknown: { bg: "bg-amber-500", pulse: false },
};

const SIZE_MAP: Record<"sm" | "md" | "lg", string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

export function StatusDot({
  variant,
  status,
  pulse: pulseProp,
  size = "md",
  className,
  label,
}: StatusDotProps) {
  const effectiveVariant = status || variant || "live";
  const { bg, pulse: defaultPulse } = VARIANT_MAP[effectiveVariant] || VARIANT_MAP.idle;
  const pulse = pulseProp !== undefined ? pulseProp : defaultPulse;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className
      )}
      title={label || variant}
      aria-label={label || variant}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            bg
          )}
        />
      )}
      <span className={cn("relative inline-flex rounded-full", sizeClass, bg)} />
    </span>
  );
}
