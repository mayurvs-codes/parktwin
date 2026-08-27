"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalProcessingStore } from "@/store/useGlobalProcessingStore";
import { uploadStationVideo, type CameraRole } from "@/services/journey";
import { processVideo } from "@/services/processing";
import { uploadAnprVideo } from "@/services/anpr";

const REFRESH_KEYS = ["vehicles", "parking", "dashboard", "analytics", "journeys"] as const;

export function GlobalProcessingManager() {
  const queryClient = useQueryClient();
  const jobs = useGlobalProcessingStore((state) => state.jobs);
  const activeJobIds = useGlobalProcessingStore((state) => state.activeJobIds);
  const getFileForJob = useGlobalProcessingStore((state) => state.getFileForJob);
  const updateJobProgress = useGlobalProcessingStore(
    (state) => state.updateJobProgress
  );
  const setJobSuccess = useGlobalProcessingStore((state) => state.setJobSuccess);
  const setJobError = useGlobalProcessingStore((state) => state.setJobError);
  const registerAbortController = useGlobalProcessingStore(
    (state) => state.registerAbortController
  );
  const unregisterAbortController = useGlobalProcessingStore(
    (state) => state.unregisterAbortController
  );

  const processingSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const id of activeJobIds) {
      const job = jobs[id];
      if (!job || job.status !== "queued") continue;
      if (processingSetRef.current.has(id)) continue;

      // Cap concurrent uploads to 1 — the backend has 1 worker and 1 thread pool.
      // Running 3 ANPR jobs simultaneously thrashes RAM/CPU and makes all of them slower.
      // Sequential processing (entry → parking → exit) is the correct UX flow anyway.
      if (processingSetRef.current.size >= 1) continue;

      const file = getFileForJob(id);
      if (!file) {
        setJobError(id, "Selected file reference missing. Please re-select file.");
        continue;
      }

      processingSetRef.current.add(id);
      const controller = new AbortController();
      registerAbortController(id, controller);

      (async () => {
        try {
          if (job.kind === "journey_station") {
            const result = await uploadStationVideo(
              file,
              job.targetId as CameraRole,
              {
                preferredSlot: job.preferredSlot,
                onUploadProgress: (pct) => updateJobProgress(id, pct),
                signal: controller.signal,
              }
            );
            setJobSuccess(id, result);
          } else if (job.kind === "cctv_camera") {
            const result = await processVideo(file, {
              cameraId: job.targetId,
              onUploadProgress: (pct) => updateJobProgress(id, pct),
              signal: controller.signal,
            });
            setJobSuccess(id, result);
          } else if (job.kind === "anpr_single") {
            const result = await uploadAnprVideo(file, {
              onUploadProgress: (pct) => updateJobProgress(id, pct),
              signal: controller.signal,
            });
            setJobSuccess(id, result);
          }

          // Invalidate query caches globally upon job completion
          for (const key of REFRESH_KEYS) {
            void queryClient.invalidateQueries({ queryKey: [key] });
          }
        } catch (err: unknown) {
          const isAborted =
            controller.signal.aborted ||
            (err as { name?: string })?.name === "CanceledError" ||
            (err as { name?: string })?.name === "AbortError" ||
            (err as { code?: string })?.code === "ERR_CANCELED";

          if (isAborted) {
            setJobError(id, "Upload stopped by user.");
          } else {
            const msg =
              err instanceof Error
                ? err.message
                : "Processing failed. Please try again.";
            setJobError(id, msg);
          }
        } finally {
          unregisterAbortController(id);
          processingSetRef.current.delete(id);
        }
      })();
    }
  }, [
    activeJobIds,
    jobs,
    getFileForJob,
    updateJobProgress,
    setJobSuccess,
    setJobError,
    registerAbortController,
    unregisterAbortController,
    queryClient,
  ]);

  return null;
}
