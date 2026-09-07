"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera as CameraIcon, Cctv } from "lucide-react";
import { ControlPanel } from "@/components/video/ControlPanel";
import { CameraPanel, type CameraPanelHandle } from "@/components/video/CameraPanel";
import { FutureRoadmap } from "@/components/video/FutureRoadmap";
import { ParallelProcessingBar, type ParallelStatus } from "@/components/video/ParallelProcessingBar";
import { TwinQuickLink } from "@/components/video/TwinQuickLink";
import { CameraArchitectureMatrix } from "@/components/video/CameraArchitectureMatrix";
import { PageHeader } from "@/components/ui/PageHeader";
import type { VideoUploadSnapshot } from "@/components/processing/VideoUpload";
import { DEFAULT_SNAPSHOT } from "@/components/video/cameraTypes";
import { fetchSessions, fetchSlots } from "@/services/parking";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { useCctvWorkspaceStore } from "@/store/useCctvWorkspaceStore";

/**
 * CCTV Control Center (Module 6 — Phase 4/5 + Parallel & Digital Twin Integration).
 *
 * Multi-camera video processing workspace. Owns the *list* of cameras and a
 * read-only map of each camera's latest `VideoUploadSnapshot`. Supports
 * multi-camera parallel processing via `handleProcessAll` and automatically
 * refreshes the Digital Twin state on completion.
 */
export function VideoProcessingView() {
  const queryClient = useQueryClient();
  const initializeSlots = useDigitalTwinStore((state) => state.initializeSlots);

  const cameras = useCctvWorkspaceStore((state) => state.cameras);
  const snapshots = useCctvWorkspaceStore((state) => state.snapshots);
  const parallelStatuses = useCctvWorkspaceStore((state) => state.parallelStatuses);
  const setSnapshot = useCctvWorkspaceStore((state) => state.setSnapshot);
  const handleRename = useCctvWorkspaceStore((state) => state.renameCamera);
  const handleAddCamera = useCctvWorkspaceStore((state) => state.addCamera);
  const handleRemoveAll = useCctvWorkspaceStore((state) => state.removeAllCameras);
  const handleReset = useCctvWorkspaceStore((state) => state.resetWorkspace);
  const handleSourceChange = useCctvWorkspaceStore((state) => state.setCameraSource);
  const handleStartAllRtsp = useCctvWorkspaceStore((state) => state.startAllRtsp);
  const setParallelStatuses = useCctvWorkspaceStore((state) => state.setParallelStatuses);

  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const cameraPanelRefs = useRef<Record<string, CameraPanelHandle | null>>({});

  // Digital Twin Integration: refresh twin store when any camera completes
  const anyCompleted = useMemo(
    () => Object.values(snapshots).some((s) => s.status === "completed"),
    [snapshots]
  );
  const prevAnyCompleted = useRef(false);

  useEffect(() => {
    if (anyCompleted && !prevAnyCompleted.current) {
      void Promise.all([fetchSlots(), fetchSessions(true, 200)]).then(([slots, sessions]) => {
        initializeSlots(slots, sessions);
      });
    }
    prevAnyCompleted.current = anyCompleted;
  }, [anyCompleted, initializeSlots]);

  const readyCameras = useMemo(
    () => cameras.filter((c) => snapshots[c.id]?.file && snapshots[c.id]?.status === "waiting"),
    [cameras, snapshots]
  );

  const handleSnapshotChange = useCallback(
    (id: string, snapshot: VideoUploadSnapshot) => {
      setSnapshot(id, snapshot);
    },
    [setSnapshot]
  );

  const handleProcessAll = useCallback(async () => {
    const ready = cameras.filter(
      (c) => snapshots[c.id]?.file && snapshots[c.id]?.status === "waiting"
    );
    if (ready.length === 0) return;

    setIsProcessingAll(true);
    setParallelStatuses(Object.fromEntries(ready.map((c) => [c.id, "running"])));

    const results = await Promise.allSettled(
      ready.map((c) => cameraPanelRefs.current[c.id]?.triggerProcess() ?? Promise.resolve())
    );

    const finalStatuses: Record<string, ParallelStatus> = {};
    results.forEach((res, i) => {
      const camId = ready[i]!.id;
      finalStatuses[camId] = res.status === "fulfilled" ? "done" : "failed";
    });

    setParallelStatuses(finalStatuses);
    setIsProcessingAll(false);

    for (const key of ["vehicles", "parking", "dashboard", "analytics"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [cameras, snapshots, queryClient, setParallelStatuses]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cctv}
        title="CCTV"
        subtitle="Multi-camera control center representing the 16-camera facility surveillance architecture"
        badge={
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400">
            16-Camera Architecture
          </span>
        }
      />

      {/* 16-Camera Facility Surveillance Topology */}
      <CameraArchitectureMatrix />

      <ControlPanel
        cameras={cameras}
        snapshots={snapshots}
        onAddCamera={handleAddCamera}
        onRemoveAll={handleRemoveAll}
        onReset={handleReset}
        onProcessAll={handleProcessAll}
        isProcessingAll={isProcessingAll}
        readyCount={readyCameras.length}
        onStartAllRtsp={handleStartAllRtsp}
      />

      <ParallelProcessingBar
        cameras={cameras}
        statuses={parallelStatuses}
        onDismiss={() => setParallelStatuses({})}
      />

      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background px-6 py-16 text-center">
          <CameraIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">No cameras configured</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Add a camera to start uploading and processing parking videos, or reset
            the control center to restore the default cameras.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddCamera}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add Camera
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Reset Cameras
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cameras.map((camera) => (
            <CameraPanel
              key={camera.id}
              ref={(el) => {
                cameraPanelRefs.current[camera.id] = el;
              }}
              camera={camera}
              snapshot={snapshots[camera.id] ?? DEFAULT_SNAPSHOT}
              onRename={handleRename}
              onSnapshotChange={handleSnapshotChange}
              onSourceChange={handleSourceChange}
            />
          ))}
        </div>
      )}

      <TwinQuickLink show={anyCompleted} />

      <FutureRoadmap />
    </div>
  );
}
