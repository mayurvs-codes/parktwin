import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";

export type VideoSourceType = "mp4" | "recorded" | "replay" | "rtsp" | "ip" | "usb" | "demo" | string;

export interface SourceBadgeProps {
  source?: VideoSourceType;
  className?: string;
  isLiveStream?: boolean;
}

export function SourceBadge({
  source = "mp4",
  className,
  isLiveStream = false,
}: SourceBadgeProps) {
  const norm = String(source).toLowerCase();
  const isActualLive = isLiveStream || norm.startsWith("rtsp") || norm.startsWith("http://") || norm === "ip";

  if (isActualLive) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-rose-400 shadow-sm",
          className
        )}
      >
        <StatusDot variant="error" size="sm" className="animate-pulse" />
        <span>LIVE</span>
      </span>
    );
  }

  if (norm === "usb") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-sky-400",
          className
        )}
      >
        <span>🔌 USB</span>
      </span>
    );
  }

  // All recorded files, mp4, replays, demos MUST be labeled REPLAY or RECORDED
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-400",
        className
      )}
    >
      <span className="text-[9px]">⏺</span>
      <span>REPLAY</span>
    </span>
  );
}
