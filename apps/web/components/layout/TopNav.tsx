"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Compass, Loader2, Menu, PanelLeft, X } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Breadcrumbs } from "./Breadcrumbs";
import { UserMenu } from "./UserMenu";
import { NotificationFeed } from "./NotificationFeed";
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";

interface TopNavProps {
  /** Toggle the desktop sidebar collapse state. */
  onToggleCollapse: () => void;
  /** Open the mobile navigation drawer. */
  onOpenMobile: () => void;
}

/** Top application bar: sidebar controls, breadcrumbs, notifications, theme + account. */
export function TopNav({ onToggleCollapse, onOpenMobile }: TopNavProps) {
  const [feedOpen, setFeedOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const jobs = useGlobalProcessingStore((state) => state.jobs);
  const activeJobIds = useGlobalProcessingStore((state) => state.activeJobIds);
  const cancelJob = useGlobalProcessingStore((state) => state.cancelJob);

  const activeJobs = activeJobIds
    .map((id) => jobs[id])
    .filter(
      (j) => j && (j.status === "uploading" || j.status === "processing" || j.status === "queued")
    );

  const primaryActiveJob = activeJobs[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open navigation"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label="Toggle sidebar"
        className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex"
      >
        <PanelLeft className="h-5 w-5" />
      </button>

      <Breadcrumbs />

      {/* Live background processing indicator with Stop button */}
      {primaryActiveJob && (
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 pl-3 pr-1.5 py-1 text-xs text-primary font-medium shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary" />
          <span className="truncate max-w-[200px]">
            {primaryActiveJob.uploadPct < 100
              ? `Uploading ${primaryActiveJob.fileName} (${primaryActiveJob.uploadPct}%)`
              : `Processing ANPR: ${primaryActiveJob.fileName}...`}
          </span>
          {activeJobs.length > 1 && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold">
              +{activeJobs.length - 1} more
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cancelJob(primaryActiveJob.id);
            }}
            title="Stop uploading / processing"
            aria-label="Stop uploading"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors shrink-0 ml-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setFeedOpen((prev) => !prev);
            setUnreadCount(0);
          }}
          aria-label="Toggle notifications panel"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-primary" />
          )}
        </button>
        <Link href="/user/dashboard">
          <button
            type="button"
            title="Switch to Driver Journey Portal"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-mono font-semibold text-sky-400 hover:bg-sky-500/20 transition-colors"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Driver Portal</span>
          </button>
        </Link>
        <ThemeToggle />
        <UserMenu />
      </div>

      <NotificationFeed
        open={feedOpen}
        onClose={() => setFeedOpen(false)}
        onEventReceived={() => {
          if (!feedOpen) setUnreadCount((c) => Math.min(c + 1, 99));
        }}
      />
    </header>
  );
}
