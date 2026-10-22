"use client";

import { create } from "zustand";
import { crossTabSyncService } from "@/services/sync/crossTabSyncService";
import { CANONICAL_60_SPACES } from "@/components/digital-twin/demoScenarioData";
import { useUserPortalStore } from "./useUserPortalStore";
import { getEnv } from "@/utils/env";
import { useVoiceStore } from "./useVoiceStore";

/** Clears backend demo state (violation episodes + voice log) so browser and backend reset together. */
function resetBackendDemoState(): void {
  if (typeof window === "undefined") return;
  void fetch(`${getEnv().apiBase}/violations/test/reset`, { method: "POST" }).catch(() => {
    /* backend unreachable: local reset still applies */
  });
}

export type PersonaType = "USER_A" | "USER_B" | "GUEST";
export type BayOperationalState = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DESIGNATED" | "VIOLATION";

export interface FocusedSpace {
  id: string; // SP-01 to SP-20
  name: string; // P01 to P20
  status: BayOperationalState;
  x: number;
  y: number;
  width: number;
  height: number;
  zone: string;
  user: string | null;
  reservation: string | null;
  designatedFor: string | null;
  vehicleId: string | null;
  plate: string | null;
  model: string | null;
  color: string | null;
  isViolation?: boolean;
  violationReason?: string | null;
  isLongStay?: boolean;
}

export interface ViolationInfo {
  active: boolean;
  vehicleId: string;
  plate: string;
  designatedSpaceId: string;
  actualSpaceId: string;
  severity: "HIGH";
  message: string;
  detectedAt: string;
  timestamp: number;
  adminAlertActive?: boolean;
  durationSeconds?: number;
}

/** Who parked where: defaults reproduce the original User A scenario (VEH-001 designated SP-07, parks in SP-11). */
export interface ViolationScenarioOptions {
  vehicleId?: string;
  plate?: string;
  designatedSpaceId?: string;
  actualSpaceId?: string;
  userName?: string;
}

export interface LongStayAlertInfo {
  active: boolean;
  vehicleId: string;
  plate: string | null;
  spaceId: string;
  durationSeconds: number;
  formattedDuration?: string;
  thresholdSeconds: number;
  detectedAt: string;
  timestamp: number;
  message: string;
}

export interface DemoActivityEvent {
  id: string;
  timestamp: number;
  timeLabel: string;
  type: "SPACE_RESERVED" | "DESIGNATED_ACCESS" | "PARKING_VIOLATION" | "SYSTEM_RESET" | "STATUS_UPDATE" | "LONG_STAY_ALERT";
  spaceId: string;
  user?: string;
  vehicleId?: string;
  message: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
}

export const FOCUSED_ZONE_SPACE_IDS = [
  "SP-01", "SP-02", "SP-03", "SP-04", "SP-05", "SP-06", "SP-07", "SP-08", "SP-09", "SP-10",
  "SP-11", "SP-12", "SP-13", "SP-14", "SP-15", "SP-16", "SP-17", "SP-18", "SP-19", "SP-20",
] as const;

export const INITIAL_AVAILABLE_SPACE_IDS = ["SP-07", "SP-11", "SP-14", "SP-17", "SP-19"] as const;

// 15 occupied spaces with deterministic single centered vehicle (Strictly Green or Red)
const BASELINE_OCCUPIED_MAP: Record<string, { vehicleId: string; plate: string; model: string; color: string }> = {
  "SP-01": { vehicleId: "VEH-011", plate: "DEMO-011", model: "Sedan", color: "#10b981" },
  "SP-02": { vehicleId: "VEH-012", plate: "DEMO-012", model: "Hatchback", color: "#ef4444" },
  "SP-03": { vehicleId: "VEH-013", plate: "DEMO-013", model: "Crossover", color: "#10b981" },
  "SP-04": { vehicleId: "VEH-014", plate: "DEMO-014", model: "EV", color: "#ef4444" },
  "SP-05": { vehicleId: "VEH-015", plate: "DEMO-015", model: "SUV", color: "#10b981" },
  "SP-06": { vehicleId: "VEH-016", plate: "DEMO-016", model: "Sedan", color: "#ef4444" },
  "SP-08": { vehicleId: "VEH-017", plate: "DEMO-017", model: "Compact", color: "#10b981" },
  "SP-09": { vehicleId: "VEH-018", plate: "DEMO-018", model: "Hybrid", color: "#ef4444" },
  "SP-10": { vehicleId: "VEH-019", plate: "DEMO-019", model: "Sedan", color: "#10b981" },
  "SP-12": { vehicleId: "VEH-020", plate: "DEMO-020", model: "Wagon", color: "#ef4444" },
  "SP-13": { vehicleId: "VEH-021", plate: "DEMO-021", model: "EV", color: "#10b981" },
  "SP-15": { vehicleId: "VEH-022", plate: "DEMO-022", model: "SUV", color: "#ef4444" },
  "SP-16": { vehicleId: "VEH-023", plate: "DEMO-023", model: "Crossover", color: "#10b981" },
  "SP-18": { vehicleId: "VEH-024", plate: "DEMO-024", model: "Compact", color: "#ef4444" },
  "SP-20": { vehicleId: "VEH-025", plate: "DEMO-025", model: "Sedan", color: "#10b981" },
};

function buildInitialSpaces(): Record<string, FocusedSpace> {
  const map: Record<string, FocusedSpace> = {};

  FOCUSED_ZONE_SPACE_IDS.forEach((id) => {
    const canonical = CANONICAL_60_SPACES.find((s) => s.id === id);
    const occupant = BASELINE_OCCUPIED_MAP[id];

    if (occupant) {
      map[id] = {
        id,
        name: canonical?.name ?? id.replace("SP-", "P"),
        status: "OCCUPIED",
        x: canonical?.x ?? 0,
        y: canonical?.y ?? 0,
        width: canonical?.width ?? 48,
        height: canonical?.height ?? 76,
        zone: canonical?.zone ?? "Zone B (Upper Island)",
        user: null,
        reservation: null,
        designatedFor: null,
        vehicleId: occupant.vehicleId,
        plate: occupant.plate,
        model: occupant.model,
        color: occupant.color,
      };
    } else if (id === "SP-07") {
      // User A's designated space
      map[id] = {
        id,
        name: canonical?.name ?? "P07",
        status: "DESIGNATED",
        x: canonical?.x ?? 0,
        y: canonical?.y ?? 0,
        width: canonical?.width ?? 48,
        height: canonical?.height ?? 76,
        zone: canonical?.zone ?? "Zone B (Upper Island)",
        user: "Registered User A",
        reservation: "ACTIVE",
        designatedFor: "USER A (VEH-001)",
        vehicleId: null,
        plate: null,
        model: null,
        color: null,
      };
    } else {
      // SP-11, SP-14, SP-17, SP-19 are clean AVAILABLE bays
      map[id] = {
        id,
        name: canonical?.name ?? id.replace("SP-", "P"),
        status: "AVAILABLE",
        x: canonical?.x ?? 0,
        y: canonical?.y ?? 0,
        width: canonical?.width ?? (id >= "SP-17" ? 76 : 48),
        height: canonical?.height ?? (id >= "SP-17" ? 48 : 76),
        zone: canonical?.zone ?? "Zone B (Upper Island)",
        user: null,
        reservation: null,
        designatedFor: null,
        vehicleId: null,
        plate: null,
        model: null,
        color: null,
      };
    }
  });

  return map;
}

const STORAGE_KEY = "parktwin_shared_demo_state_v1";

export interface SharedDemoState {
  activePersona: PersonaType;
  selectedSpaceId: string | null;
  spaces: Record<string, FocusedSpace>;
  violation: ViolationInfo | null;
  longStayAlert: LongStayAlertInfo | null;
  activityEvents: DemoActivityEvent[];
  lastUpdated: number;

  // Actions
  setActivePersona: (persona: PersonaType) => void;
  selectSpace: (spaceId: string | null) => void;
  reserveSpace: (spaceId: string, userType?: "USER_B" | "GUEST") => void;
  cancelReservation: (spaceId: string) => void;
  occupySpace: (
    spaceId: string,
    vehicleId: string,
    plate: string | null,
    model?: string,
    color?: string
  ) => void;
  releaseSpace: (spaceId: string) => void;
  triggerViolation: (opts?: ViolationScenarioOptions) => void;
  clearViolation: () => void;
  escalateViolationToAdminAlert: (durationSeconds?: number) => void;
  deescalateViolationAlert: () => void;
  triggerLongStayAlert: (info: LongStayAlertInfo) => void;
  clearLongStayAlert: (spaceId?: string) => void;
  resetAll: (options?: { syncUserPortal?: boolean }) => void;
  applyRemoteState: (state: Partial<SharedDemoState>) => void;
}

function extractSerializableState(state: Partial<SharedDemoState>) {
  return {
    activePersona: state.activePersona,
    selectedSpaceId: state.selectedSpaceId,
    spaces: state.spaces,
    violation: state.violation,
    longStayAlert: state.longStayAlert,
    activityEvents: state.activityEvents,
    lastUpdated: state.lastUpdated ?? Date.now(),
  };
}

function saveStateToStorage(state: Partial<SharedDemoState>) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(extractSerializableState(state));
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn("[SharedDemoState] Failed to persist state", err);
  }
}

function loadInitialState(): Partial<SharedDemoState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

export const useSharedDemoState = create<SharedDemoState>((set, get) => {
  const initialSpaces = buildInitialSpaces();

  return {
    activePersona: "USER_A",
    selectedSpaceId: "SP-07",
    spaces: initialSpaces,
    violation: null,
    longStayAlert: null,
    activityEvents: [
      {
        id: "evt_init_1",
        timestamp: Date.now() - 60000,
        timeLabel: "10:00:00",
        type: "DESIGNATED_ACCESS",
        spaceId: "SP-07",
        user: "Registered User A",
        vehicleId: "VEH-001",
        message: "Designated space SP-07 assigned to Registered User A (VEH-001)",
        severity: "INFO",
      },
    ],
    lastUpdated: Date.now(),

    setActivePersona: (persona: PersonaType) => {
      set((state) => {
        const nextSpaces = { ...state.spaces };
        let nextSelected = state.selectedSpaceId;

        // Synchronize with User Portal Store
        const userStore = useUserPortalStore.getState();

        if (persona === "USER_A") {
          // Highlight designated space SP-07
          nextSelected = "SP-07";
          if (nextSpaces["SP-07"] && nextSpaces["SP-07"].status !== "OCCUPIED") {
            nextSpaces["SP-07"] = {
              ...nextSpaces["SP-07"],
              status: "DESIGNATED",
              user: "Registered User A",
              designatedFor: "USER A (VEH-001)",
              reservation: "ACTIVE",
            };
          }

          userStore.selectVehicle("VEH-001");
          const jny = userStore.journeys?.["VEH-001"];
          if (jny?.journeyStep !== "PARKED" && jny?.journeyStep !== "PARKING_SESSION") {
            userStore.assignSpace("SP-07");
          }
        } else if (persona === "USER_B") {
          // If User B already has a reservation, select that, otherwise clear selection so inspector shows Focused Zone Overview
          const reservedByB = Object.values(nextSpaces).find((s) => s.user === "Registered User B");
          nextSelected = reservedByB ? reservedByB.id : null;

          userStore.selectVehicle("VEH-002");
          const jny = userStore.journeys?.["VEH-002"];
          if (reservedByB) {
            userStore.assignSpace(reservedByB.id);
          } else if (jny?.journeyStep !== "PARKED" && jny?.journeyStep !== "PARKING_SESSION") {
            userStore.resetJourney();
          }
        } else {
          // GUEST: clear previous selection so inspector returns to Focused Zone Overview
          nextSelected = null;

          userStore.selectVehicle("VEH-003");
          const jny = userStore.journeys?.["VEH-003"];
          if (jny?.journeyStep !== "PARKED" && jny?.journeyStep !== "PARKING_SESSION") {
            userStore.resetJourney();
          }
        }

        const next = {
          ...state,
          activePersona: persona,
          selectedSpaceId: nextSelected,
          spaces: nextSpaces,
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    selectSpace: (spaceId: string | null) => {
      set((state) => {
        const next = { ...state, selectedSpaceId: spaceId, lastUpdated: Date.now() };
        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    reserveSpace: (spaceId: string, userType: "USER_B" | "GUEST" = "USER_B") => {
      set((state) => {
        const target = state.spaces[spaceId];
        if (!target || target.status === "OCCUPIED" || target.status === "VIOLATION") {
          return state;
        }

        const userName = userType === "USER_B" ? "Registered User B" : "Guest User";
        const updatedSpace: FocusedSpace = {
          ...target,
          status: "RESERVED",
          user: userName,
          reservation: "CONFIRMED",
          designatedFor: null, // A reservation is NOT a designation — only DESIGNATED state sets this
        };

        const newEvent: DemoActivityEvent = {
          id: `evt_res_${Date.now()}`,
          timestamp: Date.now(),
          timeLabel: new Date().toLocaleTimeString(),
          type: "SPACE_RESERVED",
          spaceId,
          user: userName,
          message: `Space ${spaceId} reserved by ${userName}`,
          severity: "INFO",
        };

        const next = {
          ...state,
          selectedSpaceId: spaceId,
          spaces: {
            ...state.spaces,
            [spaceId]: updatedSpace,
          },
          activityEvents: [newEvent, ...state.activityEvents].slice(0, 30),
          lastUpdated: Date.now(),
        };

        // Synchronize with User Portal Store
        const userStore = useUserPortalStore.getState();
        if (userType === "USER_B") {
          userStore.selectVehicle("VEH-002");
          userStore.assignSpace(spaceId);
        } else {
          userStore.selectVehicle("VEH-003");
          userStore.assignSpace(spaceId);
        }

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    cancelReservation: (spaceId: string) => {
      set((state) => {
        const target = state.spaces[spaceId];
        if (!target) return state;

        const updatedSpace: FocusedSpace = {
          ...target,
          status: "AVAILABLE",
          user: null,
          reservation: null,
          designatedFor: null,
        };

        const newEvent: DemoActivityEvent = {
          id: `evt_cnl_${Date.now()}`,
          timestamp: Date.now(),
          timeLabel: new Date().toLocaleTimeString(),
          type: "STATUS_UPDATE",
          spaceId,
          message: `Reservation on space ${spaceId} released (now AVAILABLE)`,
          severity: "INFO",
        };

        const next = {
          ...state,
          spaces: {
            ...state.spaces,
            [spaceId]: updatedSpace,
          },
          activityEvents: [newEvent, ...state.activityEvents].slice(0, 30),
          lastUpdated: Date.now(),
        };

        // Synchronize with User Portal Store
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useUserPortalStore } = require("./useUserPortalStore");
          const userStore = useUserPortalStore.getState();
          if (userStore.assignedSpaceId === spaceId) {
            userStore.resetJourney();
          }
        } catch {}

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    occupySpace: (
      spaceId: string,
      vehicleId: string,
      plate: string | null,
      model?: string,
      color?: string
    ) => {
      set((state) => {
        const target = state.spaces[spaceId];
        if (!target) return state;

        const updatedSpace: FocusedSpace = {
          ...target,
          status: "OCCUPIED",
          vehicleId,
          plate: plate ?? target.plate,
          model: model ?? target.model ?? "Vehicle",
          color: color ?? target.color ?? "#10b981",
        };

        const next = {
          ...state,
          spaces: {
            ...state.spaces,
            [spaceId]: updatedSpace,
          },
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    releaseSpace: (spaceId: string) => {
      set((state) => {
        const target = state.spaces[spaceId];
        if (!target) return state;

        const isUserADesignated = spaceId === "SP-07";
        const updatedSpace: FocusedSpace = isUserADesignated
          ? {
              ...target,
              status: "DESIGNATED",
              user: "Registered User A",
              designatedFor: "USER A (VEH-001)",
              reservation: "ACTIVE",
              vehicleId: null,
              plate: null,
              isViolation: false,
              violationReason: null,
              isLongStay: false,
            }
          : {
              ...target,
              status: "AVAILABLE",
              user: null,
              reservation: null,
              designatedFor: null,
              vehicleId: null,
              plate: null,
              isViolation: false,
              violationReason: null,
              isLongStay: false,
            };

        const newEvent: DemoActivityEvent = {
          id: `evt_rel_${Date.now()}`,
          timestamp: Date.now(),
          timeLabel: new Date().toLocaleTimeString(),
          type: "STATUS_UPDATE",
          spaceId,
          message: `Bay ${spaceId} released (now ${updatedSpace.status})`,
          severity: "INFO",
        };

        const isViolationSpace = state.violation?.actualSpaceId === spaceId;

        const next = {
          ...state,
          spaces: {
            ...state.spaces,
            [spaceId]: updatedSpace,
          },
          violation: isViolationSpace ? null : state.violation,
          longStayAlert: state.longStayAlert?.spaceId === spaceId ? null : state.longStayAlert,
          activityEvents: [newEvent, ...state.activityEvents].slice(0, 30),
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    triggerViolation: (opts: ViolationScenarioOptions = {}) => {
      set((state) => {
        // Default: VEH-001 (designated for SP-07) parks in SP-11. User B and Guest pass their own bays.
        const actualSpaceId = opts.actualSpaceId ?? "SP-11";
        const designatedSpaceId = opts.designatedSpaceId ?? "SP-07";
        const vehicleId = opts.vehicleId ?? "VEH-001";
        const plate = opts.plate ?? "KA04MN8049";
        const userName = opts.userName ?? "Registered User A";

        const target = state.spaces[actualSpaceId];
        if (!target) return state;

        const violationInfo: ViolationInfo = {
          active: true,
          vehicleId,
          plate,
          designatedSpaceId,
          actualSpaceId,
          severity: "HIGH",
          message: `Vehicle ${vehicleId} parked in unauthorized bay ${actualSpaceId} (Designated: ${designatedSpaceId}). Grace period active.`,
          detectedAt: new Date().toLocaleTimeString(),
          timestamp: Date.now(),
          adminAlertActive: false, // Core Rule: 0:00–9:59 dwell monitoring only, NO immediate Admin 10-minute alert!
          durationSeconds: 0,
        };

        const updatedActualSpace: FocusedSpace = {
          ...target,
          status: "VIOLATION",
          vehicleId,
          plate,
          model: "Electric Sedan",
          color: "#ef4444", // Red visual distinction on twin map
          isViolation: true,
          violationReason: `Wrong space: Expected ${designatedSpaceId}, parked in ${actualSpaceId}. Driver warned.`,
        };

        const newEvent: DemoActivityEvent = {
          id: `evt_viol_${Date.now()}`,
          timestamp: Date.now(),
          timeLabel: violationInfo.detectedAt,
          type: "PARKING_VIOLATION",
          spaceId: actualSpaceId,
          user: userName,
          vehicleId,
          message: `PARKING VIOLATION: ${vehicleId} expected ${designatedSpaceId}, detected in ${actualSpaceId}`,
          severity: "CRITICAL",
        };

        const next = {
          ...state,
          selectedSpaceId: actualSpaceId,
          violation: violationInfo,
          spaces: {
            ...state.spaces,
            [actualSpaceId]: updatedActualSpace,
          },
          activityEvents: [newEvent, ...state.activityEvents].slice(0, 30),
          lastUpdated: Date.now(),
        };

        // Synchronize with User Portal Store for continuous SP-11 duration tracking
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { useUserPortalStore } = require("./useUserPortalStore");
          const userStore = useUserPortalStore.getState();
          userStore.selectVehicle(vehicleId);
          const targetSpace = CANONICAL_60_SPACES.find((s) => s.id === actualSpaceId);
          const nowMs = Date.now();
          const nowStr = new Date().toLocaleTimeString();
          const newSession = {
            sessionId: `sess_${vehicleId}_${nowMs}`,
            vehicleId,
            spaceId: actualSpaceId,
            zone: targetSpace?.zone ?? "Zone B (Lower Island)",
            level: "B2",
            entryTime: nowStr,
            parkedTime: nowStr,
            durationSeconds: 0,
            parkedTimeMs: nowMs,
            isParked: true,
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useUserPortalStore.setState((s: any) => {
            const currentJny = s.journeys?.[vehicleId] || {};
            const updatedJny = {
              ...currentJny,
              journeyStep: "PARKED",
              assignedSpaceId: actualSpaceId,
              assignedSpace: targetSpace ?? null,
              activeSession: newSession,
              sessionDurationSeconds: 0,
              sessionTimerRunning: true,
              parkedTimeMs: nowMs,
            };
            return {
              ...s,
              journeys: {
                ...s.journeys,
                [vehicleId]: updatedJny,
              },
              journeyStep: "PARKED",
              assignedSpaceId: actualSpaceId,
              assignedSpace: targetSpace ?? null,
              activeSession: newSession,
              sessionDurationSeconds: 0,
              sessionTimerRunning: true,
            };
          });
        } catch {}

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    clearViolation: () => {
      set((state) => {
        const actualSpaceId = state.violation?.actualSpaceId ?? "SP-11";
        const target = state.spaces[actualSpaceId];
        const fallback = buildInitialSpaces()[actualSpaceId]!;
        const baseSpace = target || fallback;

        const updatedActualSpace: FocusedSpace = {
          ...baseSpace,
          status: "AVAILABLE",
          vehicleId: null,
          plate: null,
          model: null,
          color: null,
          isViolation: false,
          violationReason: null,
          isLongStay: false,
        };

        const next = {
          ...state,
          violation: null,
          spaces: {
            ...state.spaces,
            [actualSpaceId]: updatedActualSpace,
          },
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    escalateViolationToAdminAlert: (durationSeconds: number = 600) => {
      set((state) => {
        if (!state.violation || !state.violation.active) return state;
        if (state.violation.adminAlertActive) return state;

        const actualSpaceId = state.violation.actualSpaceId;
        const designatedSpaceId = state.violation.designatedSpaceId;
        const vehicleId = state.violation.vehicleId;

        const updatedViolation: ViolationInfo = {
          ...state.violation,
          adminAlertActive: true,
          durationSeconds,
          message: `OPERATIONAL ALERT: Vehicle ${vehicleId} unauthorized in bay ${actualSpaceId} (Expected: ${designatedSpaceId}) exceeded 10m threshold. Action required.`,
        };

        const target = state.spaces[actualSpaceId];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedSpace: FocusedSpace = target
          ? {
              ...target,
              status: "VIOLATION",
              isViolation: true,
              violationReason: `UNRESOLVED VIOLATION: In ${actualSpaceId} for ${Math.floor(durationSeconds / 60)}m+. Expected: ${designatedSpaceId}.`,
            }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : ({} as any);

        const newEvent: DemoActivityEvent = {
          id: `evt_viol_${Date.now()}`,
          timestamp: Date.now(),
          timeLabel: new Date().toLocaleTimeString(),
          type: "PARKING_VIOLATION",
          spaceId: actualSpaceId,
          user: "Registered User A",
          vehicleId,
          message: `PARKING VIOLATION: ${vehicleId} expected ${designatedSpaceId}, actual ${actualSpaceId}. Duration ${Math.floor(durationSeconds / 60)}+ min. STATUS: ACTION REQUIRED`,
          severity: "CRITICAL",
        };

        const next = {
          ...state,
          violation: updatedViolation,
          spaces: {
            ...state.spaces,
            [actualSpaceId]: updatedSpace,
          },
          activityEvents: [newEvent, ...state.activityEvents].slice(0, 30),
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    deescalateViolationAlert: () => {
      set((state) => {
        if (!state.violation || !state.violation.adminAlertActive) return state;
        const actualSpaceId = state.violation.actualSpaceId;
        const target = state.spaces[actualSpaceId];

        const updatedViolation: ViolationInfo = {
          ...state.violation,
          adminAlertActive: false,
        };

        const updatedSpace: FocusedSpace | undefined = target
          ? {
              ...target,
              status: "OCCUPIED",
              isViolation: true,
            }
          : undefined;

        const next = {
          ...state,
          violation: updatedViolation,
          spaces: updatedSpace
            ? {
                ...state.spaces,
                [actualSpaceId]: updatedSpace,
              }
            : state.spaces,
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    triggerLongStayAlert: (info: LongStayAlertInfo) => {
      set((state) => {
        const space = state.spaces[info.spaceId];
        const updatedSpaces = { ...state.spaces };
        if (space) {
          updatedSpaces[info.spaceId] = {
            ...space,
            isLongStay: true,
          };
        }

        const newEvent: DemoActivityEvent = {
          id: `evt_longstay_${Date.now()}`,
          timestamp: Date.now(),
          timeLabel: info.detectedAt || new Date().toLocaleTimeString(),
          type: "LONG_STAY_ALERT",
          spaceId: info.spaceId,
          user: space?.user ?? "Registered Driver",
          vehicleId: info.vehicleId,
          message: `LONG-STAY ALERT: Vehicle ${info.vehicleId} exceeded 10-minute parking duration limit in space ${info.spaceId}. Still occupied in same bay.`,
          severity: "WARNING",
        };

        const next = {
          ...state,
          longStayAlert: info,
          spaces: updatedSpaces,
          activityEvents: [newEvent, ...state.activityEvents].slice(0, 30),
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    clearLongStayAlert: (spaceId?: string) => {
      set((state) => {
        if (!state.longStayAlert && !Object.values(state.spaces).some((s) => s.isLongStay)) {
          return state;
        }

        const updatedSpaces = { ...state.spaces };
        Object.keys(updatedSpaces).forEach((id) => {
          const sp = updatedSpaces[id];
          if (sp && (!spaceId || id === spaceId)) {
            if (sp.isLongStay) {
              updatedSpaces[id] = { ...sp, isLongStay: false };
            }
          }
        });

        const next = {
          ...state,
          longStayAlert: spaceId && state.longStayAlert?.spaceId !== spaceId ? state.longStayAlert : null,
          spaces: updatedSpaces,
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });
    },

    resetAll: (options?: { syncUserPortal?: boolean }) => {
      const syncUserPortal = options?.syncUserPortal ?? true;
      resetBackendDemoState();
      useVoiceStore.getState().clearLog();

      // 1. Clear both storage keys
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem("parktwin_user_portal_state_v1");
        } catch {}
      }

      set((state) => {
        const freshSpaces = buildInitialSpaces();
        const resetEvent: DemoActivityEvent = {
          id: `evt_reset_${Date.now()}`,
          timestamp: Date.now(),
          timeLabel: new Date().toLocaleTimeString(),
          type: "SYSTEM_RESET",
          spaceId: "FACILITY",
          message: "Demo reset: restored 15 occupied, 4 available, 1 designated for User A (SP-07).",
          severity: "INFO",
        };

        const next = {
          ...state,
          activePersona: "USER_A" as const,
          selectedSpaceId: "SP-07",
          spaces: freshSpaces,
          violation: null,
          longStayAlert: null,
          activityEvents: [resetEvent],
          lastUpdated: Date.now(),
        };

        saveStateToStorage(next);
        crossTabSyncService.broadcastSharedDemo(extractSerializableState(next));
        return next;
      });

      // 2. Synchronize with User Portal Store
      if (syncUserPortal) {
        useUserPortalStore.getState().resetDemo({ syncShared: false });
      }
    },

    applyRemoteState: (partial: Partial<SharedDemoState>) => {
      set((state) => ({
        ...state,
        ...partial,
        lastUpdated: Date.now(),
      }));
    },
  };
});

// Setup Cross-Tab listener on client
if (typeof window !== "undefined") {
  // Hydrate from storage if present
  const stored = loadInitialState();
  if (stored) {
    useSharedDemoState.getState().applyRemoteState(stored);
  }

  // Subscribe to BroadcastChannel sync
  crossTabSyncService.subscribe((msg) => {
    if (msg.type === "SYNC_SHARED_DEMO") {
      const payload = msg.payload as { state?: Partial<SharedDemoState> };
      if (payload && payload.state) {
        useSharedDemoState.getState().applyRemoteState(payload.state);
      }
    } else if (msg.type === "SYNC_RESET") {
      useSharedDemoState.getState().resetAll();
    }
  });

  (window as any).__useSharedDemoState = useSharedDemoState;
}


/** Persist + broadcast the current shared demo state (used after backend WebSocket updates). */
export function persistSharedDemoState(): void {
  const st = useSharedDemoState.getState();
  saveStateToStorage(st);
  crossTabSyncService.broadcastSharedDemo(extractSerializableState(st));
}
