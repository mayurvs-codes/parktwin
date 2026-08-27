"use client";

import { CheckCircle2, Loader2, XCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CameraConfig } from "./cameraTypes";

export type ParallelStatus = "idle" | "running" | "done" | "failed";

interface ParallelProcessingBarProps {
  cameras: CameraConfig[];
  statuses: Record<string, ParallelStatus>;
  onDismiss: () => void;
}

export function ParallelProcessingBar({
  cameras,
  statuses,
  onDismiss,
}: ParallelProcessingBarProps) {
  const statusEntries = Object.entries(statuses);
  if (statusEntries.length === 0) return null;

  const total = statusEntries.length;
  const completedCount = statusEntries.filter(
    ([, s]) => s === "done" || s === "failed"
  ).length;
  const failedCount = statusEntries.filter(([, s]) => s === "failed").length;
  const isRunning = statusEntries.some(([, s]) => s === "running");

  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
            )}
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              {isRunning
                ? `Processing ${total} cameras in parallel…`
                : "Multi-Camera Processing Complete"}
            </h4>
            <Badge variant="secondary" className="font-mono text-xs">
              {completedCount} / {total} Done
            </Badge>
            {failedCount > 0 && (
              <Badge variant="destructive" className="font-mono text-xs">
                {failedCount} Failed
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            aria-label="Dismiss progress bar"
            className="h-8 px-2 text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Dismiss
          </Button>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-secondary/80 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-2 transition-all duration-300 ease-in-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Per-camera status chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {cameras
            .filter((c) => c.id in statuses)
            .map((c) => {
              const st = statuses[c.id];
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs"
                >
                  {st === "running" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                  {st === "done" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  {st === "failed" && (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  {st === "idle" && (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                  )}
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-muted-foreground font-mono">({c.id})</span>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
