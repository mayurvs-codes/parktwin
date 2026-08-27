import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoUploadStatus } from "@/components/processing/VideoUpload";
import {
  PIPELINE_STAGES,
  computePipelineStates,
  type StageState,
} from "./pipelineStages";

/**
 * AI Processing Pipeline (Module 6 — Phase 5).
 *
 * Vertical timeline of the real ParkTwin AI pipeline. The current stage is
 * highlighted from the frontend upload/processing status only — this never
 * fabricates backend events. When processing finishes, the whole chain is
 * marked completed.
 */
export function AiPipeline({ status }: { status: VideoUploadStatus }) {
  const states = computePipelineStates(status);

  return (
    <ol className="space-y-0" aria-label="AI processing pipeline">
      {PIPELINE_STAGES.map((stage, i) => {
        const state: StageState = states[i] ?? "pending";
        const isLast = i === PIPELINE_STAGES.length - 1;

        return (
          <li
            key={stage.key}
            className="flex gap-3"
            aria-current={state === "active" ? "step" : undefined}
          >
            {/* Left rail: stage icon + connector line to the next stage. */}
            <div className="flex flex-col items-center">
              <StageIcon state={state} />
              {!isLast && (
                <span
                  className={cn(
                    "my-1 w-px flex-1",
                    state === "completed" ? "bg-emerald-500/40" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
            </div>

            <div className={cn("pb-4", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm leading-5",
                  state === "active" && "font-semibold text-primary",
                  state === "completed" && "text-foreground",
                  state === "failed" && "font-semibold text-destructive",
                  state === "pending" && "text-muted-foreground"
                )}
              >
                {stage.label}
                {stage.detail && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    {stage.detail}
                  </span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Per-state glyph for a pipeline stage. */
function StageIcon({ state }: { state: StageState }) {
  switch (state) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />;
    case "active":
      return (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />
      );
    case "failed":
      return <XCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />;
    case "pending":
    default:
      return (
        <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" aria-hidden />
      );
  }
}
