import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { VideoUploadSnapshot } from "@/components/processing/VideoUpload";
import {
  INITIAL_CAMERAS,
  type CameraConfig,
  type CameraSource,
} from "@/components/video/cameraTypes";
import type { ParallelStatus } from "@/components/video/ParallelProcessingBar";

export interface CctvWorkspaceState {
  cameras: CameraConfig[];
  snapshots: Record<string, VideoUploadSnapshot>;
  parallelStatuses: Record<string, ParallelStatus>;
  nextCameraNumber: number;

  setSnapshot: (id: string, snapshot: VideoUploadSnapshot) => void;
  renameCamera: (id: string, name: string) => void;
  setCameraSource: (id: string, source: CameraSource) => void;
  addCamera: () => void;
  removeAllCameras: () => void;
  resetWorkspace: () => void;
  startAllRtsp: () => void;
  setParallelStatuses: (statuses: Record<string, ParallelStatus>) => void;
}

export const useCctvWorkspaceStore = create<CctvWorkspaceState>()(
  persist(
    (set) => ({
      cameras: INITIAL_CAMERAS,
      snapshots: {},
      parallelStatuses: {},
      nextCameraNumber: INITIAL_CAMERAS.length + 1,

      setSnapshot: (id, snapshot) =>
        set((state) => ({
          snapshots: {
            ...state.snapshots,
            [id]: {
              ...snapshot,
              file: null, // ensure serializability
            },
          },
        })),

      renameCamera: (id, name) =>
        set((state) => ({
          cameras: state.cameras.map((cam) =>
            cam.id === id ? { ...cam, name } : cam
          ),
        })),

      setCameraSource: (id, source) =>
        set((state) => ({
          cameras: state.cameras.map((cam) =>
            cam.id === id ? { ...cam, source } : cam
          ),
        })),

      addCamera: () =>
        set((state) => {
          const n = state.nextCameraNumber;
          const id = `CAM-${String(n).padStart(3, "0")}`;
          return {
            cameras: [
              ...state.cameras,
              { id, name: `Camera ${n}`, source: "upload" },
            ],
            nextCameraNumber: n + 1,
          };
        }),

      removeAllCameras: () =>
        set({
          cameras: [],
          snapshots: {},
          parallelStatuses: {},
        }),

      resetWorkspace: () =>
        set({
          cameras: INITIAL_CAMERAS,
          snapshots: {},
          parallelStatuses: {},
          nextCameraNumber: INITIAL_CAMERAS.length + 1,
        }),

      startAllRtsp: () =>
        set((state) => ({
          cameras: state.cameras.map((cam) => ({ ...cam, source: "rtsp" })),
        })),

      setParallelStatuses: (statuses) => set({ parallelStatuses: statuses }),
    }),
    {
      name: "parktwin-cctv-workspace",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        cameras: state.cameras,
        snapshots: Object.fromEntries(
          Object.entries(state.snapshots).map(([id, snap]) => [
            id,
            { ...snap, file: null },
          ])
        ),
        parallelStatuses: state.parallelStatuses,
        nextCameraNumber: state.nextCameraNumber,
      }),
    }
  )
);
