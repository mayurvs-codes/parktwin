import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CameraRole, JourneyUploadResult } from "@/services/journey";
import type { ProcessVideoResult } from "@/services/processing";
import type { AnprUploadResult } from "@/services/anpr";

export type JobKind = "journey_station" | "cctv_camera" | "anpr_single";
export type JobStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export interface GlobalJob {
  id: string; // e.g. "journey:entry", "cctv:CAM-001", "anpr:single"
  kind: JobKind;
  targetId: string;
  fileName: string;
  fileSizeMb?: number;
  status: JobStatus;
  uploadPct: number;
  result?: JourneyUploadResult | ProcessVideoResult | AnprUploadResult | null;
  error?: string | null;
  preferredSlot?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GlobalProcessingStore {
  jobs: Record<string, GlobalJob>;
  activeJobIds: string[];

  // Pending file references for execution (kept in memory, not persisted)
  fileMap: Map<string, File>;

  addJob: (
    id: string,
    kind: JobKind,
    targetId: string,
    file: File,
    preferredSlot?: string
  ) => void;
  updateJobProgress: (id: string, uploadPct: number) => void;
  updateJobStatus: (id: string, status: JobStatus) => void;
  setJobSuccess: (
    id: string,
    result: JourneyUploadResult | ProcessVideoResult | AnprUploadResult
  ) => void;
  setJobError: (id: string, errorMsg: string) => void;
  removeJob: (id: string) => void;
  cancelJob: (id: string) => void;
  cancelAllJobs: () => void;
  clearAllJobs: () => void;
  getFileForJob: (id: string) => File | undefined;
  registerAbortController: (id: string, controller: AbortController) => void;
  unregisterAbortController: (id: string) => void;
}

const fileMapInMemory = new Map<string, File>();
const abortControllerMapInMemory = new Map<string, AbortController>();

export const useGlobalProcessingStore = create<GlobalProcessingStore>()(
  persist(
    (set, get) => ({
      jobs: {},
      activeJobIds: [],
      fileMap: fileMapInMemory,

      addJob: (id, kind, targetId, file, preferredSlot) => {
        fileMapInMemory.set(id, file);
        const newJob: GlobalJob = {
          id,
          kind,
          targetId,
          fileName: file.name,
          fileSizeMb: Number((file.size / 1024 / 1024).toFixed(1)),
          status: "queued",
          uploadPct: 0,
          preferredSlot,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          jobs: { ...state.jobs, [id]: newJob },
          activeJobIds: state.activeJobIds.includes(id)
            ? state.activeJobIds
            : [...state.activeJobIds, id],
        }));
      },

      updateJobProgress: (id, uploadPct) =>
        set((state) => {
          const job = state.jobs[id];
          if (!job) return state;
          return {
            jobs: {
              ...state.jobs,
              [id]: {
                ...job,
                uploadPct,
                status: uploadPct < 100 ? "uploading" : "processing",
              },
            },
          };
        }),

      updateJobStatus: (id, status) =>
        set((state) => {
          const job = state.jobs[id];
          if (!job) return state;
          return {
            jobs: {
              ...state.jobs,
              [id]: { ...job, status },
            },
          };
        }),

      setJobSuccess: (id, result) => {
        fileMapInMemory.delete(id);
        set((state) => {
          const job = state.jobs[id];
          if (!job) return state;
          return {
            jobs: {
              ...state.jobs,
              [id]: {
                ...job,
                status: "completed",
                uploadPct: 100,
                result,
                completedAt: new Date().toISOString(),
              },
            },
            activeJobIds: state.activeJobIds.filter((jId) => jId !== id),
          };
        });
      },

      setJobError: (id, errorMsg) => {
        fileMapInMemory.delete(id);
        set((state) => {
          const job = state.jobs[id];
          if (!job) return state;
          return {
            jobs: {
              ...state.jobs,
              [id]: {
                ...job,
                status: "failed",
                error: errorMsg,
                completedAt: new Date().toISOString(),
              },
            },
            activeJobIds: state.activeJobIds.filter((jId) => jId !== id),
          };
        });
      },

      removeJob: (id) => {
        const controller = abortControllerMapInMemory.get(id);
        if (controller) {
          controller.abort("Job removed");
          abortControllerMapInMemory.delete(id);
        }
        fileMapInMemory.delete(id);
        set((state) => {
          const nextJobs = { ...state.jobs };
          delete nextJobs[id];
          return {
            jobs: nextJobs,
            activeJobIds: state.activeJobIds.filter((jId) => jId !== id),
          };
        });
      },

      cancelJob: (id) => {
        const controller = abortControllerMapInMemory.get(id);
        if (controller) {
          controller.abort("User cancelled upload");
          abortControllerMapInMemory.delete(id);
        }
        fileMapInMemory.delete(id);
        set((state) => {
          const job = state.jobs[id];
          if (!job) return state;
          return {
            jobs: {
              ...state.jobs,
              [id]: {
                ...job,
                status: "failed",
                error: "Upload stopped by user.",
                completedAt: new Date().toISOString(),
              },
            },
            activeJobIds: state.activeJobIds.filter((jId) => jId !== id),
          };
        });
      },

      cancelAllJobs: () => {
        for (const [id, controller] of abortControllerMapInMemory.entries()) {
          controller.abort("User cancelled all uploads");
        }
        abortControllerMapInMemory.clear();
        fileMapInMemory.clear();
        set((state) => {
          const nextJobs = { ...state.jobs };
          for (const id of state.activeJobIds) {
            if (nextJobs[id]) {
              nextJobs[id] = {
                ...nextJobs[id],
                status: "failed",
                error: "Upload stopped by user.",
                completedAt: new Date().toISOString(),
              };
            }
          }
          return {
            jobs: nextJobs,
            activeJobIds: [],
          };
        });
      },

      clearAllJobs: () => {
        for (const [, controller] of abortControllerMapInMemory.entries()) {
          controller.abort("Clear all jobs");
        }
        abortControllerMapInMemory.clear();
        fileMapInMemory.clear();
        set({ jobs: {}, activeJobIds: [] });
      },

      getFileForJob: (id) => fileMapInMemory.get(id),

      registerAbortController: (id, controller) => {
        abortControllerMapInMemory.set(id, controller);
      },

      unregisterAbortController: (id) => {
        abortControllerMapInMemory.delete(id);
      },
    }),
    {
      name: "parktwin-global-processing",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        jobs: state.jobs,
        activeJobIds: state.activeJobIds,
      }),
    }
  )
);
