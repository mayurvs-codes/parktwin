import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CameraRole, JourneyUploadResult } from "@/services/journey";

export interface StationData {
  result: JourneyUploadResult;
  fileName: string;
  timestamp: string;
}

export interface JourneyStationStore {
  stations: Partial<Record<CameraRole, StationData>>;
  preferredSlots: Partial<Record<CameraRole, string>>;
  setStationResult: (
    role: CameraRole,
    result: JourneyUploadResult,
    fileName: string
  ) => void;
  setPreferredSlot: (role: CameraRole, slot: string) => void;
  clearStationResult: (role: CameraRole) => void;
  clearAll: () => void;
}

export const useJourneyStationStore = create<JourneyStationStore>()(
  persist(
    (set) => ({
      stations: {},
      preferredSlots: {},

      setStationResult: (role, result, fileName) =>
        set((state) => ({
          stations: {
            ...state.stations,
            [role]: {
              result,
              fileName,
              timestamp: new Date().toISOString(),
            },
          },
        })),

      setPreferredSlot: (role, slot) =>
        set((state) => ({
          preferredSlots: {
            ...state.preferredSlots,
            [role]: slot,
          },
        })),

      clearStationResult: (role) =>
        set((state) => {
          const nextStations = { ...state.stations };
          delete nextStations[role];
          return { stations: nextStations };
        }),

      clearAll: () =>
        set({
          stations: {},
          preferredSlots: {},
        }),
    }),
    {
      name: "parktwin-journey-stations",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
