"use client";

import { create } from "zustand";
import { useDemoMovieStore } from "./useDemoMovieStore";
import { useSharedDemoState } from "./useSharedDemoState";
import {
  DEMO_VEHICLES,
  DEMO_VEHICLE_IDS,
  type DemoVehicleId,
  type DemoVehicleDefinition,
} from "@/config/demoVehicles";
import {
  ACCESS_POINT_B2,
  CANONICAL_60_SPACES,
  type DemoParkingSpace,
} from "@/components/digital-twin/demoScenarioData";
import {
  buildRouteToSpace,
  buildRouteToExit,
  type UserNavigationRoute,
  type NavigationRouteStep,
  type NavigationRouteType,
} from "@/services/navigationRouter";
import type { NormalizedParkingEvent } from "@/types/parkingEvents";
import { eventNormalizer } from "@/services/evidence/eventNormalizer";
import { evidenceReplayController, type EvidenceTimelineStep } from "@/services/evidence/evidenceReplayController";
import { evidenceVehicleMapper } from "@/services/evidence/evidenceVehicleMapper";
import { crossTabSyncService } from "@/services/sync/crossTabSyncService";
import { evaluateParkingDuration, formatDurationDisplay } from "@/services/parkingDurationMonitor";

export type { UserNavigationRoute, NavigationRouteStep, NavigationRouteType };
export type ExecutionMode = "DEMO" | "EVIDENCE";

export type VehicleJourneyStep =
  | "NOT_SEEN"
  | "ENTRY_DETECTED"
  | "VEHICLE_IDENTIFIED"
  | "RESERVATION_CHECK"
  | "SPACE_ASSIGNED"
  | "NAVIGATING_TO_SPACE"
  | "PARKED"
  | "PARKING_SESSION"
  | "EXIT_REQUESTED"
  | "NAVIGATING_TO_EXIT"
  | "AT_GATEWAY"
  | "EXIT_CONFIRMED"
  | "SESSION_COMPLETE";

export interface UserParkingSession {
  sessionId: string;
  vehicleId: DemoVehicleId;
  spaceId: string;
  zone: string;
  level: string;
  entryTime: string;
  parkedTime: string;
  parkedTimeMs?: number | null;
  exitStartTime?: string;
  exitStartTimeMs?: number | null;
  exitTime?: string;
  durationSeconds: number;
  wasReserved: boolean;
}

export interface VehicleDriverJourney {
  vehicleId: DemoVehicleId;
  journeyStep: VehicleJourneyStep;
  assignedSpaceId: string | null;
  assignedSpace: DemoParkingSpace | null;
  activeSession: UserParkingSession | null;
  sessionDurationSeconds: number;
  sessionTimerRunning: boolean;
  parkedTimeMs: number | null;
  exitStartTimeMs: number | null;
  navigationMode: "ENTRY_TO_SPACE" | "SPACE_TO_EXIT";
  currentRoute: UserNavigationRoute | null;
  vehiclePosition: [number, number] | null;
  vehicleHeading: number;
  version: number;
  conflictError?: string | null;
}

export interface UserPortalStoreState {
  // Active Driver Vehicle & Definitions
  activeVehicleId: DemoVehicleId;
  vehicleDef: DemoVehicleDefinition;

  // Isolated per-vehicle journey records
  journeys: Record<DemoVehicleId, VehicleDriverJourney>;

  // Active Vehicle Mirrors for React ergonomics
  journeyStep: VehicleJourneyStep;
  assignedSpaceId: string | null;
  assignedSpace: DemoParkingSpace | null;
  activeSession: UserParkingSession | null;
  sessionDurationSeconds: number;
  sessionTimerRunning: boolean;
  navigationMode: "ENTRY_TO_SPACE" | "SPACE_TO_EXIT";
  currentRoute: UserNavigationRoute | null;
  vehiclePosition: [number, number] | null;
  vehicleHeading: number;
  conflictError: string | null;

  // Completed Sessions for Dynamic Analytics
  completedSessions: UserParkingSession[];

  // Mode: Manual Demo vs Real CCTV/ANPR Evidence
  executionMode: ExecutionMode;
  events: NormalizedParkingEvent[];
  evidenceStepIndex: number;

  // Demo Controller State
  isDemoPlaying: boolean;

  // ── Actions ──
  selectVehicle: (id: DemoVehicleId) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  addEvent: (evt: NormalizedParkingEvent) => void;
  stepEvidenceReplay: () => EvidenceTimelineStep | null;
  resetEvidenceReplay: () => void;

  // Journey State Machine with Transition Guards
  detectEntry: () => void;
  identifyVehicle: () => void;
  checkReservation: () => void;
  assignSpace: (spaceId: string) => boolean;
  startNavigation: () => void;
  advanceNavigationStep: () => void;
  arriveAtSpace: () => boolean;
  viewParkingSession: () => void;
  requestExit: () => void;
  reachGateway: () => void;
  confirmExit: () => void;
  completeSession: () => void;
  resetJourney: () => void;

  // Demo Controller Actions
  resetDemo: (options?: { broadcast?: boolean } | unknown) => void;
  stepNextEvent: () => void;
  playPauseDemo: () => void;

  // Live Timer Tick & Helpers
  tickDuration: (deltaSeconds: number) => void;
  advanceSessionTime: (seconds: number) => void;
  checkDurationAlerts: () => void;
  relocateVehicle: (newSpaceId: string) => boolean;
  clearConflictError: () => void;
}

export const STORAGE_KEY_USER_PORTAL = "parktwin_user_portal_state_v1";

export function getCurrentTimeFormatted(): string {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${strMinutes} ${ampm}`;
}

export function getActiveSessionDuration(session: UserParkingSession | null): number {
  if (!session) return 0;
  if (session.exitTime) return session.durationSeconds;
  if (session.parkedTimeMs) {
    return Math.max(0, Math.floor((Date.now() - session.parkedTimeMs) / 1000));
  }
  return session.durationSeconds;
}

/**
 * Deterministic slot conflict guard:
 * Verifies if slotId is already claimed or occupied by any vehicle other than currentVehicleId.
 */
export function checkSlotConflict(
  slotId: string,
  currentVehicleId: DemoVehicleId,
  journeys: Record<DemoVehicleId, VehicleDriverJourney>,
  sharedSpaces: { id: string; isOccupied: boolean; currentVehicleId?: string | null }[]
): { hasConflict: boolean; conflictingVehicleId?: string } {
  if (!slotId) return { hasConflict: false };

  // Check facility spaces
  const space = sharedSpaces.find((s) => s.id === slotId);
  if (space && space.isOccupied && space.currentVehicleId && space.currentVehicleId !== currentVehicleId) {
    return { hasConflict: true, conflictingVehicleId: space.currentVehicleId };
  }

  // Check other vehicle journeys
  for (const [vId, jny] of Object.entries(journeys) as [DemoVehicleId, VehicleDriverJourney][]) {
    if (vId === currentVehicleId) continue;
    if (jny && jny.assignedSpaceId === slotId) {
      if (
        jny.journeyStep === "PARKED" ||
        jny.journeyStep === "PARKING_SESSION" ||
        jny.journeyStep === "NAVIGATING_TO_SPACE" ||
        jny.journeyStep === "SPACE_ASSIGNED"
      ) {
        return { hasConflict: true, conflictingVehicleId: vId };
      }
    }
  }

  return { hasConflict: false };
}

export function createInitialVehicleJourney(id: DemoVehicleId): VehicleDriverJourney {
  const def = DEMO_VEHICLES[id]!;
  const targetSpaceId = def.scenario.assignedSpaceId;
  const space = targetSpaceId ? CANONICAL_60_SPACES.find((s) => s.id === targetSpaceId) || null : null;
  const hasRes = def.scenario.hasReservation;

  return {
    vehicleId: id,
    journeyStep: hasRes ? "SPACE_ASSIGNED" : "ENTRY_DETECTED",
    assignedSpaceId: space ? space.id : null,
    assignedSpace: space,
    activeSession: null,
    sessionDurationSeconds: 0,
    sessionTimerRunning: false,
    parkedTimeMs: null,
    exitStartTimeMs: null,
    navigationMode: "ENTRY_TO_SPACE",
    currentRoute: space ? buildRouteToSpace(space) : null,
    vehiclePosition: [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
    vehicleHeading: 180,
    version: 1,
    conflictError: null,
  };
}

export function createInitialJourneys(): Record<DemoVehicleId, VehicleDriverJourney> {
  const map: Partial<Record<DemoVehicleId, VehicleDriverJourney>> = {};
  for (const id of DEMO_VEHICLE_IDS) {
    map[id] = createInitialVehicleJourney(id);
  }
  return map as Record<DemoVehicleId, VehicleDriverJourney>;
}

function saveUserPortalToStorage(
  journeys: Record<DemoVehicleId, VehicleDriverJourney>,
  activeVehicleId: DemoVehicleId,
  completedSessions: UserParkingSession[],
  executionMode: ExecutionMode
) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      version: 1,
      activeVehicleId,
      journeys,
      completedSessions,
      executionMode,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY_USER_PORTAL, JSON.stringify(payload));
  } catch (err) {
    // Non-blocking quota/storage errors
  }
}

function loadUserPortalFromStorage(): {
  journeys: Record<DemoVehicleId, VehicleDriverJourney>;
  activeVehicleId: DemoVehicleId;
  completedSessions: UserParkingSession[];
  executionMode: ExecutionMode;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_PORTAL);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.journeys) {
      const now = Date.now();
      for (const vId of Object.keys(parsed.journeys) as DemoVehicleId[]) {
        const jny = parsed.journeys[vId];
        // Cleanse legacy SP-24 for VEH-001
        if (vId === "VEH-001" && (jny.assignedSpaceId === "SP-24" || !jny.assignedSpaceId)) {
          jny.assignedSpaceId = "SP-07";
        }
        // Cleanse unreserved VEH-002 if no active session
        if (vId === "VEH-002" && jny.assignedSpaceId && !jny.activeSession) {
          const sharedRaw = localStorage.getItem("parktwin_shared_demo_state_v1");
          let isReservedInShared = false;
          if (sharedRaw) {
            try {
              const sharedParsed = JSON.parse(sharedRaw);
              if (sharedParsed?.spaces?.[jny.assignedSpaceId]?.status === "RESERVED") {
                isReservedInShared = true;
              }
            } catch {}
          }
          if (!isReservedInShared) {
            jny.assignedSpaceId = null;
            jny.assignedSpace = null;
            jny.currentRoute = null;
            jny.journeyStep = "ENTRY_DETECTED";
          }
        }
        // Cleanse Guest VEH-003 if no active session
        if (vId === "VEH-003" && !jny.activeSession) {
          jny.assignedSpaceId = null;
          jny.assignedSpace = null;
          jny.currentRoute = null;
          jny.journeyStep = "ENTRY_DETECTED";
        }

        if (jny && jny.assignedSpaceId) {
          const freshSpace = CANONICAL_60_SPACES.find((s) => s.id === jny.assignedSpaceId);
          if (freshSpace) {
            jny.assignedSpace = freshSpace;
            if (jny.journeyStep === "NAVIGATING_TO_SPACE" || jny.journeyStep === "SPACE_ASSIGNED") {
              jny.currentRoute = buildRouteToSpace(freshSpace);
            }
          }
        }
        if (jny && jny.activeSession && jny.activeSession.parkedTimeMs && !jny.activeSession.exitTime) {
          const liveSecs = Math.max(0, Math.floor((now - jny.activeSession.parkedTimeMs) / 1000));
          jny.sessionDurationSeconds = liveSecs;
          jny.activeSession.durationSeconds = liveSecs;
        }
      }
      return parsed;
    }
  } catch (err) {
    console.warn("[UserPortalStore] Storage parse error", err);
  }
  return null;
}

function updateActiveJourneyState(
  state: UserPortalStoreState,
  partial: Partial<VehicleDriverJourney>
): Partial<UserPortalStoreState> {
  const vehicleId = state.activeVehicleId;
  const current = state.journeys[vehicleId] || createInitialVehicleJourney(vehicleId);
  const nextVersion = (current.version ?? 0) + 1;

  const updatedJourney: VehicleDriverJourney = {
    ...current,
    ...partial,
    version: nextVersion,
  };

  const updatedJourneys = {
    ...state.journeys,
    [vehicleId]: updatedJourney,
  };

  saveUserPortalToStorage(updatedJourneys, vehicleId, state.completedSessions, state.executionMode);

  return {
    journeys: updatedJourneys,
    journeyStep: updatedJourney.journeyStep,
    assignedSpaceId: updatedJourney.assignedSpaceId,
    assignedSpace: updatedJourney.assignedSpace,
    activeSession: updatedJourney.activeSession,
    sessionDurationSeconds: updatedJourney.sessionDurationSeconds,
    sessionTimerRunning: updatedJourney.sessionTimerRunning,
    navigationMode: updatedJourney.navigationMode,
    currentRoute: updatedJourney.currentRoute,
    vehiclePosition: updatedJourney.vehiclePosition,
    vehicleHeading: updatedJourney.vehicleHeading,
    conflictError: updatedJourney.conflictError ?? null,
  };
}

export const useUserPortalStore = create<UserPortalStoreState>((set, get) => {
  const persisted = typeof window !== "undefined" ? loadUserPortalFromStorage() : null;
  const initialVehicleId: DemoVehicleId = (persisted?.activeVehicleId as DemoVehicleId) || "VEH-001";
  const initialJourneys = persisted?.journeys || createInitialJourneys();
  const initialJourney = initialJourneys[initialVehicleId] || createInitialVehicleJourney(initialVehicleId);

  return {
    activeVehicleId: initialVehicleId,
    vehicleDef: DEMO_VEHICLES[initialVehicleId]!,
    journeys: initialJourneys,

    journeyStep: initialJourney.journeyStep,
    assignedSpaceId: initialJourney.assignedSpaceId,
    assignedSpace: initialJourney.assignedSpace,
    activeSession: initialJourney.activeSession,
    sessionDurationSeconds: initialJourney.sessionDurationSeconds,
    sessionTimerRunning: initialJourney.sessionTimerRunning,
    navigationMode: initialJourney.navigationMode,
    currentRoute: initialJourney.currentRoute,
    vehiclePosition: initialJourney.vehiclePosition,
    vehicleHeading: initialJourney.vehicleHeading,
    conflictError: initialJourney.conflictError ?? null,
    completedSessions: [],
    executionMode: "DEMO",
    events: [],
    evidenceStepIndex: -1,
    isDemoPlaying: false,

    clearConflictError: () => {
      set({ conflictError: null });
    },

    setExecutionMode: (mode: ExecutionMode) => {
      set({ executionMode: mode });
    },

    addEvent: (evt: NormalizedParkingEvent) => {
      set((state) => ({ events: [evt, ...state.events].slice(0, 50) }));
    },

    stepEvidenceReplay: () => {
      const step = evidenceReplayController.stepNext();
      if (!step) return null;

      const demoId = step.mappedDemoVehicleId as DemoVehicleId | undefined;
      const def = demoId ? DEMO_VEHICLES[demoId] : undefined;

      // Generate normalized events
      const entryEvt = eventNormalizer.createEntryDetectedEvent(step.evidence, demoId);
      const plateEvt = eventNormalizer.createPlateRecognizedEvent(step.evidence, demoId);

      // Select and update vehicle if mapped
      if (demoId) {
        get().selectVehicle(demoId);
      }

      // Add to event stream
      set((state) => ({
        events: [plateEvt, entryEvt, ...state.events].slice(0, 50),
        evidenceStepIndex: step.stepIndex,
      }));

      // Ingest into shared demo movie store for Admin Twin sync
      const movieStore = useDemoMovieStore.getState();
      const existingEvents = movieStore.events;
      const demoEvt = {
        id: entryEvt.eventId,
        timeSeconds: step.frameId,
        timeLabel: `${Math.floor(step.frameId / 30)}s`,
        eventType: "VEHICLE_ENTRY" as const,
        vehicleId: demoId ?? `TRK-${step.evidence.trackId}`,
        plate: step.evidence.plateNumber ?? "PENDING_ANPR",
        slotId: def?.scenario.assignedSpaceId ?? "SP-08",
        message: `ANPR Benchmark Detection: Track #${step.evidence.trackId} (${step.evidence.plateNumber ?? "Pending ANPR"}) at B2 Gateway`,
        camera: "CAM-01",
      };
      useDemoMovieStore.setState({ events: [demoEvt, ...existingEvents] });

      crossTabSyncService.broadcastEvidenceStep({
        stepIndex: step.stepIndex,
        frameId: step.frameId,
        trackId: step.evidence.trackId,
        plateNumber: step.evidence.plateNumber,
        mappedVehicleId: demoId,
        events: [plateEvt, entryEvt],
      });

      return step;
    },

    resetEvidenceReplay: () => {
      evidenceReplayController.reset();
      get().resetDemo();
      set({
        evidenceStepIndex: -1,
        events: [],
      });
    },

    selectVehicle: (id: DemoVehicleId) => {
      const def = DEMO_VEHICLES[id];
      if (!def) return;

      const { activeVehicleId, journeys } = get();

      // Snapshot current vehicle
      const currentJourney: VehicleDriverJourney = {
        vehicleId: activeVehicleId,
        journeyStep: get().journeyStep,
        assignedSpaceId: get().assignedSpaceId,
        assignedSpace: get().assignedSpace,
        activeSession: get().activeSession,
        sessionDurationSeconds: get().sessionDurationSeconds,
        sessionTimerRunning: get().sessionTimerRunning,
        parkedTimeMs: get().activeSession?.parkedTimeMs ?? null,
        exitStartTimeMs: get().activeSession?.exitStartTimeMs ?? null,
        navigationMode: get().navigationMode,
        currentRoute: get().currentRoute,
        vehiclePosition: get().vehiclePosition,
        vehicleHeading: get().vehicleHeading,
        version: (journeys[activeVehicleId]?.version ?? 0) + 1,
        conflictError: null,
      };

      const updatedJourneys = {
        ...journeys,
        [activeVehicleId]: currentJourney,
      };

      const targetJourney = updatedJourneys[id] || createInitialVehicleJourney(id);
      updatedJourneys[id] = targetJourney;

      // Update derived duration for target vehicle if parked
      if (targetJourney.activeSession && targetJourney.activeSession.parkedTimeMs && !targetJourney.activeSession.exitTime) {
        const liveSecs = Math.max(0, Math.floor((Date.now() - targetJourney.activeSession.parkedTimeMs) / 1000));
        targetJourney.sessionDurationSeconds = liveSecs;
        targetJourney.activeSession.durationSeconds = liveSecs;
      }

      saveUserPortalToStorage(updatedJourneys, id, get().completedSessions, get().executionMode);

      set({
        activeVehicleId: id,
        vehicleDef: def,
        journeys: updatedJourneys,
        journeyStep: targetJourney.journeyStep,
        assignedSpaceId: targetJourney.assignedSpaceId,
        assignedSpace: targetJourney.assignedSpace,
        activeSession: targetJourney.activeSession,
        sessionDurationSeconds: targetJourney.sessionDurationSeconds,
        sessionTimerRunning: targetJourney.sessionTimerRunning,
        navigationMode: targetJourney.navigationMode,
        currentRoute: targetJourney.currentRoute,
        vehiclePosition: targetJourney.vehiclePosition,
        vehicleHeading: targetJourney.vehicleHeading,
        conflictError: null,
      });
    },

    detectEntry: () => {
      const { journeyStep } = get();
      if (journeyStep !== "NOT_SEEN") return;
      set((state) => updateActiveJourneyState(state, { journeyStep: "ENTRY_DETECTED", conflictError: null }));
    },

    identifyVehicle: () => {
      const { journeyStep } = get();
      if (journeyStep !== "ENTRY_DETECTED") return;
      set((state) => updateActiveJourneyState(state, { journeyStep: "VEHICLE_IDENTIFIED", conflictError: null }));
    },

    checkReservation: () => {
      const { journeyStep, vehicleDef } = get();
      if (journeyStep !== "VEHICLE_IDENTIFIED") return;
      const nextStep: VehicleJourneyStep = vehicleDef.scenario.hasReservation ? "SPACE_ASSIGNED" : "RESERVATION_CHECK";
      set((state) => updateActiveJourneyState(state, { journeyStep: nextStep, conflictError: null }));
    },

    assignSpace: (spaceId: string) => {
      const { journeyStep, activeVehicleId, journeys, vehiclePosition } = get();
      const validSteps: VehicleJourneyStep[] = [
        "NOT_SEEN",
        "ENTRY_DETECTED",
        "VEHICLE_IDENTIFIED",
        "RESERVATION_CHECK",
        "SPACE_ASSIGNED",
        "NAVIGATING_TO_SPACE",
      ];
      if (!validSteps.includes(journeyStep)) return false;

      const space = CANONICAL_60_SPACES.find((s) => s.id === spaceId);
      if (!space) return false;

      // Deterministic conflict prevention guard
      const sharedSpaces = useDemoMovieStore.getState().spaces;
      const conflict = checkSlotConflict(spaceId, activeVehicleId, journeys, sharedSpaces);
      if (conflict.hasConflict) {
        const err = `SLOT_UNAVAILABLE_CONFLICT: Space ${spaceId} is already occupied or claimed by ${conflict.conflictingVehicleId}.`;
        console.warn(err);
        set((state) => updateActiveJourneyState(state, { conflictError: err }));
        return false;
      }

      const route = buildRouteToSpace(space);
      const nextJourneyStep: VehicleJourneyStep =
        journeyStep === "NAVIGATING_TO_SPACE" ? "NAVIGATING_TO_SPACE" : "SPACE_ASSIGNED";

      set((state) =>
        updateActiveJourneyState(state, {
          assignedSpaceId: space.id,
          assignedSpace: space,
          journeyStep: nextJourneyStep,
          currentRoute: route,
          navigationMode: "ENTRY_TO_SPACE",
          vehiclePosition: vehiclePosition || [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
          conflictError: null,
        })
      );
      return true;
    },

    startNavigation: () => {
      const { journeyStep, assignedSpace, activeVehicleId, vehicleDef, journeys } = get();
      if (journeyStep !== "SPACE_ASSIGNED" && journeyStep !== "RESERVATION_CHECK") return;

      // If no bay is explicitly assigned yet, auto-assign vehicle's default recommended bay if available
      let targetSpace = assignedSpace;
      if (!targetSpace && vehicleDef?.scenario?.defaultRecommendedSpaceId) {
        const sharedSpaces = useDemoMovieStore.getState().spaces;
        const rec = sharedSpaces.find((s) => s.id === vehicleDef.scenario.defaultRecommendedSpaceId);
        if (rec && !rec.isOccupied) {
          const success = get().assignSpace(rec.id);
          if (success) {
            targetSpace = get().assignedSpace;
          }
        }
      }

      if (!targetSpace) return;

      const sharedSpaces = useDemoMovieStore.getState().spaces;
      const conflict = checkSlotConflict(targetSpace.id, activeVehicleId, journeys, sharedSpaces);
      if (conflict.hasConflict) {
        const err = `SLOT_UNAVAILABLE_CONFLICT: Space ${targetSpace.id} is already occupied or claimed by ${conflict.conflictingVehicleId}.`;
        console.warn(err);
        set((state) => updateActiveJourneyState(state, { conflictError: err }));
        return;
      }

      const route = buildRouteToSpace(targetSpace);
      set((state) =>
        updateActiveJourneyState(state, {
          assignedSpaceId: targetSpace!.id,
          assignedSpace: targetSpace,
          journeyStep: "NAVIGATING_TO_SPACE",
          currentRoute: route,
          navigationMode: "ENTRY_TO_SPACE",
          vehiclePosition: [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
          conflictError: null,
        })
      );

      crossTabSyncService.broadcastJourney({
        vehicleId: activeVehicleId,
        journeyStep: "NAVIGATING_TO_SPACE",
        assignedSpaceId: targetSpace.id,
        vehiclePosition: [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
      });
    },

    advanceNavigationStep: () => {
      const { currentRoute, vehiclePosition, journeyStep, activeVehicleId } = get();
      if (!currentRoute || !currentRoute.points || currentRoute.points.length < 2) return;

      const points = currentRoute.points;
      let currentIndex = 0;
      if (vehiclePosition) {
        let minDist = Infinity;
        for (let i = 0; i < points.length; i++) {
          const p = points[i]!;
          const d = Math.hypot(p[0] - vehiclePosition[0], p[1] - vehiclePosition[1]);
          if (d < minDist) {
            minDist = d;
            currentIndex = i;
          }
        }
      }

      if (currentIndex < points.length - 1) {
        const nextIndex = currentIndex + 1;
        const nextPoint = points[nextIndex]!;
        const prevPoint = points[currentIndex]!;

        const dy = nextPoint[1] - prevPoint[1];
        const dx = nextPoint[0] - prevPoint[0];
        const headingDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

        let remaining = 0;
        for (let i = nextIndex; i < points.length - 1; i++) {
          const p1 = points[i]!;
          const p2 = points[i + 1]!;
          remaining += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.1;
        }
        const roundedRemaining = Math.round(remaining);

        set((state) =>
          updateActiveJourneyState(state, {
            vehiclePosition: nextPoint,
            vehicleHeading: (headingDeg + 360) % 360,
            currentRoute: { ...currentRoute, distanceRemainingMeters: roundedRemaining },
          })
        );

        if (nextIndex === points.length - 1) {
          if (journeyStep === "NAVIGATING_TO_SPACE") {
            get().arriveAtSpace();
          } else if (journeyStep === "NAVIGATING_TO_EXIT") {
            get().reachGateway();
          }
        }
      } else {
        if (journeyStep === "NAVIGATING_TO_SPACE") {
          get().arriveAtSpace();
        } else if (journeyStep === "NAVIGATING_TO_EXIT") {
          get().reachGateway();
        }
      }
    },

    arriveAtSpace: () => {
      const { journeyStep, assignedSpace, activeVehicleId, vehicleDef, journeys } = get();
      if (journeyStep !== "NAVIGATING_TO_SPACE") return false;
      if (!assignedSpace) return false;

      // Slot conflict guard
      const sharedSpaces = useDemoMovieStore.getState().spaces;
      const conflict = checkSlotConflict(assignedSpace.id, activeVehicleId, journeys, sharedSpaces);
      if (conflict.hasConflict) {
        const err = `SLOT_UNAVAILABLE_CONFLICT: Cannot park in ${assignedSpace.id}. Space is already occupied by ${conflict.conflictingVehicleId}.`;
        console.warn(err);
        set((state) => updateActiveJourneyState(state, { conflictError: err }));
        return false;
      }

      const nowMs = Date.now();
      const nowStr = getCurrentTimeFormatted();
      const newSession: UserParkingSession = {
        sessionId: `sess_${activeVehicleId}_${nowMs}`,
        vehicleId: activeVehicleId,
        spaceId: assignedSpace.id,
        zone: assignedSpace.zone,
        level: "B2",
        entryTime: vehicleDef.evidence.detectedAt,
        parkedTime: nowStr,
        parkedTimeMs: nowMs,
        durationSeconds: 0,
        wasReserved: vehicleDef.scenario.hasReservation,
      };

      set((state) =>
        updateActiveJourneyState(state, {
          journeyStep: "PARKED",
          activeSession: newSession,
          sessionDurationSeconds: 0,
          sessionTimerRunning: true,
          parkedTimeMs: nowMs,
          vehiclePosition: [assignedSpace.x, assignedSpace.y],
          conflictError: null,
        })
      );

      // Synchronize Admin Digital Twin
      useDemoMovieStore.getState().applyVehicleOccupancy(
        assignedSpace.id,
        true,
        activeVehicleId,
        vehicleDef.evidence.plate
      );

      // Synchronize Shared Demo State for focused zone
      const sharedDemo = useSharedDemoState.getState();
      if (sharedDemo.spaces[assignedSpace.id]) {
        sharedDemo.occupySpace(
          assignedSpace.id,
          activeVehicleId,
          vehicleDef.evidence.plate,
          vehicleDef.scenario.model,
          vehicleDef.scenario.color
        );
      }

      crossTabSyncService.broadcastOccupancy({
        spaceId: assignedSpace.id,
        isOccupied: true,
        vehicleId: activeVehicleId,
        plate: vehicleDef.evidence.plate,
      });

      crossTabSyncService.broadcastJourney({
        vehicleId: activeVehicleId,
        journeyStep: "PARKED",
        assignedSpaceId: assignedSpace.id,
        sessionDurationSeconds: 0,
        activeSession: newSession,
        vehiclePosition: [assignedSpace.x, assignedSpace.y],
      });

      return true;
    },

    relocateVehicle: (newSpaceId: string) => {
      const { activeVehicleId, activeSession, vehicleDef } = get();
      if (!activeSession) return false;

      const oldSpaceId = activeSession.spaceId;
      if (oldSpaceId === newSpaceId) return false;

      const targetSpace = CANONICAL_60_SPACES.find((s) => s.id === newSpaceId);
      if (!targetSpace) return false;

      // 1. Release old space in shared demo & demo movie store
      const sharedDemo = useSharedDemoState.getState();
      if (sharedDemo.spaces[oldSpaceId]) {
        sharedDemo.releaseSpace(oldSpaceId);
      }
      sharedDemo.clearLongStayAlert(oldSpaceId);
      if (sharedDemo.violation?.actualSpaceId === oldSpaceId) {
        sharedDemo.clearViolation();
      }
      useDemoMovieStore.getState().applyVehicleOccupancy(oldSpaceId, false, activeVehicleId, null);

      // 2. Occupy new space
      if (sharedDemo.spaces[newSpaceId]) {
        sharedDemo.occupySpace(
          newSpaceId,
          activeVehicleId,
          vehicleDef.evidence.plate,
          vehicleDef.scenario.model,
          vehicleDef.scenario.color
        );
      }
      useDemoMovieStore.getState().applyVehicleOccupancy(
        newSpaceId,
        true,
        activeVehicleId,
        vehicleDef.evidence.plate
      );

      // 3. Create fresh session starting at 00:00:00 (Date.now())
      const nowMs = Date.now();
      const nowStr = getCurrentTimeFormatted();
      const freshSession: UserParkingSession = {
        sessionId: `sess_${activeVehicleId}_${nowMs}`,
        vehicleId: activeVehicleId,
        spaceId: newSpaceId,
        zone: targetSpace.zone,
        level: "B2",
        entryTime: vehicleDef.evidence.detectedAt,
        parkedTime: nowStr,
        durationSeconds: 0,
        parkedTimeMs: nowMs,
        wasReserved: Boolean(vehicleDef.scenario.hasReservation),
      };

      set((state) =>
        updateActiveJourneyState(state, {
          assignedSpaceId: newSpaceId,
          assignedSpace: targetSpace,
          activeSession: freshSession,
          sessionDurationSeconds: 0,
          journeyStep: "PARKED",
          vehiclePosition: [targetSpace.x, targetSpace.y],
          conflictError: null,
        })
      );

      // 4. Broadcast updates across tabs
      crossTabSyncService.broadcastOccupancy({
        spaceId: oldSpaceId,
        isOccupied: false,
        vehicleId: null,
        plate: null,
      });
      crossTabSyncService.broadcastOccupancy({
        spaceId: newSpaceId,
        isOccupied: true,
        vehicleId: activeVehicleId,
        plate: vehicleDef.evidence.plate,
      });
      crossTabSyncService.broadcastJourney({
        vehicleId: activeVehicleId,
        journeyStep: "PARKED",
        assignedSpaceId: newSpaceId,
        sessionDurationSeconds: 0,
        activeSession: freshSession,
        vehiclePosition: [targetSpace.x, targetSpace.y],
      });

      get().checkDurationAlerts();
      return true;
    },

    viewParkingSession: () => {
      const { journeyStep } = get();
      if (journeyStep !== "PARKED" && journeyStep !== "PARKING_SESSION") return;
      set((state) => updateActiveJourneyState(state, { journeyStep: "PARKING_SESSION", conflictError: null }));
    },

    requestExit: () => {
      const { journeyStep, assignedSpace, activeVehicleId } = get();
      if (journeyStep !== "PARKING_SESSION" && journeyStep !== "PARKED") return;
      if (!assignedSpace) return;

      const exitRoute = buildRouteToExit(assignedSpace);
      const nowStr = getCurrentTimeFormatted();
      const nowMs = Date.now();

      // Clear long-stay alert as vehicle is leaving the space
      useSharedDemoState.getState().clearLongStayAlert(assignedSpace.id);

      set((state) => {
        const sessionWithExit = state.activeSession
          ? { ...state.activeSession, exitStartTime: nowStr, exitStartTimeMs: nowMs }
          : null;
        return updateActiveJourneyState(state, {
          journeyStep: "NAVIGATING_TO_EXIT",
          navigationMode: "SPACE_TO_EXIT",
          currentRoute: exitRoute,
          activeSession: sessionWithExit,
          exitStartTimeMs: nowMs,
          conflictError: null,
        });
      });

      crossTabSyncService.broadcastJourney({
        vehicleId: activeVehicleId,
        journeyStep: "NAVIGATING_TO_EXIT",
        assignedSpaceId: assignedSpace.id,
        vehiclePosition: [assignedSpace.x, assignedSpace.y],
      });
    },

    reachGateway: () => {
      const { journeyStep, activeVehicleId } = get();
      if (journeyStep !== "NAVIGATING_TO_EXIT") return;

      set((state) =>
        updateActiveJourneyState(state, {
          journeyStep: "AT_GATEWAY",
          vehiclePosition: [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
          conflictError: null,
        })
      );

      crossTabSyncService.broadcastJourney({
        vehicleId: activeVehicleId,
        journeyStep: "AT_GATEWAY",
        assignedSpaceId: get().assignedSpaceId,
        vehiclePosition: [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
      });
    },

    confirmExit: () => {
      const { journeyStep, assignedSpaceId, activeSession, activeVehicleId } = get();
      if (journeyStep !== "AT_GATEWAY") return;

      const spaceIdToFree = assignedSpaceId || activeSession?.spaceId;

      const nowMs = Date.now();
      const exitTimeStr = getCurrentTimeFormatted();
      const finalDuration = activeSession?.parkedTimeMs
        ? Math.max(0, Math.floor((nowMs - activeSession.parkedTimeMs) / 1000))
        : (activeSession?.durationSeconds ?? 0);

      const completedSession: UserParkingSession | null = activeSession
        ? {
            ...activeSession,
            exitTime: exitTimeStr,
            durationSeconds: finalDuration,
          }
        : null;

      set((state) => {
        const updated = updateActiveJourneyState(state, {
          journeyStep: "SESSION_COMPLETE",
          sessionTimerRunning: false,
          activeSession: null,
          assignedSpaceId: null,
          assignedSpace: null,
          vehiclePosition: [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
          conflictError: null,
        });
        return {
          ...updated,
          completedSessions: completedSession
            ? [...state.completedSessions, completedSession]
            : state.completedSessions,
        };
      });

      // Synchronize Admin Digital Twin
      if (spaceIdToFree) {
        useDemoMovieStore.getState().applyVehicleOccupancy(spaceIdToFree, false, activeVehicleId, null);
        const sharedDemo = useSharedDemoState.getState();
        if (sharedDemo.spaces[spaceIdToFree]) {
          sharedDemo.releaseSpace(spaceIdToFree);
        }
        crossTabSyncService.broadcastOccupancy({
          spaceId: spaceIdToFree,
          isOccupied: false,
          vehicleId: null,
          plate: null,
        });
      }

      crossTabSyncService.broadcastJourney({
        vehicleId: activeVehicleId,
        journeyStep: "SESSION_COMPLETE",
        assignedSpaceId: spaceIdToFree ?? null,
        sessionDurationSeconds: finalDuration,
        activeSession: null,
        vehiclePosition: [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y],
      });
    },

    completeSession: () => {
      const { journeyStep } = get();
      if (journeyStep !== "SESSION_COMPLETE" && journeyStep !== "EXIT_CONFIRMED") return;
      get().resetJourney();
    },

    resetJourney: () => {
      const { activeVehicleId, journeys } = get();
      useSharedDemoState.getState().clearLongStayAlert();
      const initial = createInitialVehicleJourney(activeVehicleId);
      const updatedJourneys = {
        ...journeys,
        [activeVehicleId]: initial,
      };

      saveUserPortalToStorage(updatedJourneys, activeVehicleId, get().completedSessions, get().executionMode);

      set({
        journeys: updatedJourneys,
        journeyStep: initial.journeyStep,
        assignedSpaceId: initial.assignedSpaceId,
        assignedSpace: initial.assignedSpace,
        activeSession: null,
        sessionDurationSeconds: 0,
        sessionTimerRunning: false,
        navigationMode: initial.navigationMode,
        currentRoute: initial.currentRoute,
        vehiclePosition: initial.vehiclePosition,
        vehicleHeading: initial.vehicleHeading,
        conflictError: null,
      });
    },

    resetDemo: (options?: { broadcast?: boolean; syncShared?: boolean } | unknown) => {
      const broadcast =
        typeof options === "object" && options !== null && "broadcast" in options
          ? (options as { broadcast?: boolean }).broadcast ?? true
          : true;
      const syncShared =
        typeof options === "object" && options !== null && "syncShared" in options
          ? (options as { syncShared?: boolean }).syncShared ?? true
          : true;

      // 1. Clear storage
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY_USER_PORTAL);
          localStorage.removeItem("parktwin_shared_demo_state_v1");
        } catch {}
      }

      // 2. Reset shared facility movie store
      useDemoMovieStore.getState().resetMovie({ broadcast: false });

      // 3. Reset all 5 vehicle journeys
      const freshJourneys = createInitialJourneys();
      const initialVehicleId: DemoVehicleId = "VEH-001";
      const initialJourney = freshJourneys[initialVehicleId];

      set({
        activeVehicleId: initialVehicleId,
        vehicleDef: DEMO_VEHICLES[initialVehicleId]!,
        journeys: freshJourneys,
        journeyStep: initialJourney.journeyStep,
        assignedSpaceId: initialJourney.assignedSpaceId,
        assignedSpace: initialJourney.assignedSpace,
        activeSession: null,
        sessionDurationSeconds: 0,
        sessionTimerRunning: false,
        navigationMode: initialJourney.navigationMode,
        currentRoute: initialJourney.currentRoute,
        vehiclePosition: initialJourney.vehiclePosition,
        vehicleHeading: initialJourney.vehicleHeading,
        conflictError: null,
        completedSessions: [],
        evidenceStepIndex: -1,
        events: [],
        isDemoPlaying: false,
      });

      // 4. Synchronize with useSharedDemoState if requested
      if (syncShared) {
        useSharedDemoState.getState().resetAll({ syncUserPortal: false });
      }

      if (broadcast) {
        crossTabSyncService.broadcastReset("USER", get().executionMode);
      }
    },

    stepNextEvent: () => {
      if (get().executionMode === "EVIDENCE") {
        get().stepEvidenceReplay();
        return;
      }

      const { journeyStep } = get();
      switch (journeyStep) {
        case "NOT_SEEN":
          get().detectEntry();
          break;
        case "ENTRY_DETECTED":
          get().identifyVehicle();
          break;
        case "VEHICLE_IDENTIFIED":
          get().checkReservation();
          break;
        case "RESERVATION_CHECK":
        case "SPACE_ASSIGNED":
          get().startNavigation();
          break;
        case "NAVIGATING_TO_SPACE":
          get().advanceNavigationStep();
          break;
        case "PARKED":
          get().viewParkingSession();
          break;
        case "PARKING_SESSION":
          get().requestExit();
          break;
        case "EXIT_REQUESTED":
        case "NAVIGATING_TO_EXIT":
          get().advanceNavigationStep();
          break;
        case "AT_GATEWAY":
          get().confirmExit();
          break;
        case "EXIT_CONFIRMED":
        case "SESSION_COMPLETE":
          get().resetJourney();
          break;
      }
    },

    playPauseDemo: () => {
      set((state) => ({ isDemoPlaying: !state.isDemoPlaying }));
    },

    tickDuration: (deltaSeconds: number) => {
      set((state) => {
        if (!state.activeSession) {
          const newSecs = state.sessionDurationSeconds + deltaSeconds;
          return updateActiveJourneyState(state, {
            sessionDurationSeconds: newSecs,
          });
        }

        const currentParkedMs = state.activeSession.parkedTimeMs ?? Date.now();
        const adjustedParkedMs = currentParkedMs - deltaSeconds * 1000;
        const liveSecs = Math.max(0, Math.floor((Date.now() - adjustedParkedMs) / 1000));

        const updatedSession = {
          ...state.activeSession,
          durationSeconds: liveSecs,
          parkedTimeMs: adjustedParkedMs,
        };

        return updateActiveJourneyState(state, {
          sessionDurationSeconds: liveSecs,
          activeSession: updatedSession,
          parkedTimeMs: adjustedParkedMs,
        });
      });
      get().checkDurationAlerts();
    },

    advanceSessionTime: (seconds: number) => {
      get().tickDuration(seconds);
    },

    checkDurationAlerts: () => {
      const { activeVehicleId, activeSession, journeyStep, vehicleDef } = get();
      const sharedState = useSharedDemoState.getState();

      if (!activeSession || (journeyStep !== "PARKED" && journeyStep !== "PARKING_SESSION") || activeSession.exitTime) {
        if (sharedState.longStayAlert && sharedState.longStayAlert.vehicleId === activeVehicleId) {
          sharedState.clearLongStayAlert(sharedState.longStayAlert.spaceId);
        }
        return;
      }

      const currentSpace = sharedState.spaces[activeSession.spaceId];
      const liveSecs = activeSession.parkedTimeMs
        ? Math.max(0, Math.floor((Date.now() - activeSession.parkedTimeMs) / 1000))
        : activeSession.durationSeconds;

      // Identify whether this vehicle is in the wrong space
      const isWrongSpace = Boolean(
        (sharedState.violation?.active && sharedState.violation.actualSpaceId === activeSession.spaceId) ||
        (activeVehicleId === "VEH-001" && activeSession.spaceId !== "SP-07")
      );

      if (isWrongSpace) {
        // WRONG PARKING POLICY:
        // 0:00–9:59 = User warned on User Portal, timer runs for actual space, Admin dwell monitoring only (NO operational violation alert).
        // 10:00+ (600s) = If still in wrong space, escalate to Admin OPERATIONAL ALERT: PARKING VIOLATION (Action Required).
        if (liveSecs >= 600) {
          sharedState.escalateViolationToAdminAlert(liveSecs);
          if (sharedState.longStayAlert?.spaceId === activeSession.spaceId) {
            sharedState.clearLongStayAlert(activeSession.spaceId);
          }
        } else {
          // Less than 10 minutes: ensure no operational alert is active
          // The 5 s "not moved" admin notification is not the 10-minute alert: leave it in place.
          if (sharedState.violation?.adminAlertActive && !sharedState.violation?.notMoved) {
            sharedState.deescalateViolationAlert();
          }
          if (sharedState.longStayAlert?.spaceId === activeSession.spaceId) {
            sharedState.clearLongStayAlert(activeSession.spaceId);
          }
        }
      } else {
        // CORRECT PARKING POLICY:
        // Expected == Actual space (User A in SP-07, User B in SP-14, Guest in their selected space)
        // >= 10:00 (600s) = Dispatch LONG_STAY_ALERT to Admin
        const evaluation = evaluateParkingDuration(
          {
            spaceId: activeSession.spaceId,
            vehicleId: activeVehicleId,
            durationSeconds: liveSecs,
            isParked: journeyStep === "PARKED" || journeyStep === "PARKING_SESSION",
            parkedTimeMs: activeSession.parkedTimeMs,
            exitTime: activeSession.exitTime,
          },
          activeSession.spaceId,
          currentSpace?.vehicleId
        );

        if (evaluation.status === "LONG_STAY_ALERT") {
          sharedState.triggerLongStayAlert({
            active: true,
            vehicleId: activeVehicleId,
            plate: vehicleDef?.evidence?.plate || currentSpace?.plate || null,
            spaceId: activeSession.spaceId,
            durationSeconds: liveSecs,
            thresholdSeconds: 600,
            detectedAt: getCurrentTimeFormatted(),
            timestamp: Date.now(),
            message: evaluation.message,
          });
        } else {
          if (sharedState.longStayAlert?.spaceId === activeSession.spaceId) {
            sharedState.clearLongStayAlert(activeSession.spaceId);
          }
        }
      }
    },
  };
});

// Cross-tab synchronization listener for Driver/User Portal
if (typeof window !== "undefined") {
  (window as any).__parktwin_user_store = useUserPortalStore;
  crossTabSyncService.subscribe((msg) => {
    if (msg.type === "SYNC_RESET") {
      if (msg.payload.source === "ADMIN") {
        useUserPortalStore.getState().resetDemo({ broadcast: false });
      }
    } else if (msg.type === "SYNC_OCCUPANCY") {
      const { spaceId, isOccupied, vehicleId, plate } = msg.payload;
      useDemoMovieStore.getState().applyVehicleOccupancy(spaceId, isOccupied, vehicleId, plate);
    } else if (msg.type === "SYNC_VEHICLE_JOURNEY") {
      const { vehicleId, journeyStep, assignedSpaceId, vehiclePosition, vehicleHeading, activeSession, sessionDurationSeconds, version } = msg.payload;
      const effectiveVersion = (msg as any).version ?? version;
      const state = useUserPortalStore.getState();
      const existingJny = state.journeys[vehicleId] || createInitialVehicleJourney(vehicleId);

      // Stale update guard
      if (typeof effectiveVersion === "number" && typeof existingJny.version === "number" && effectiveVersion < existingJny.version) {
        return;
      }

      const space = assignedSpaceId ? CANONICAL_60_SPACES.find((s) => s.id === assignedSpaceId) || null : null;
      const updatedJny: VehicleDriverJourney = {
        ...existingJny,
        journeyStep,
        assignedSpaceId,
        assignedSpace: space,
        activeSession: activeSession !== undefined ? activeSession : existingJny.activeSession,
        sessionDurationSeconds: sessionDurationSeconds !== undefined ? sessionDurationSeconds : existingJny.sessionDurationSeconds,
        sessionTimerRunning: journeyStep === "PARKED" || journeyStep === "PARKING_SESSION",
        parkedTimeMs: activeSession?.parkedTimeMs ?? existingJny.parkedTimeMs,
        vehiclePosition: vehiclePosition ?? existingJny.vehiclePosition,
        vehicleHeading: vehicleHeading ?? existingJny.vehicleHeading,
        version: effectiveVersion ?? (existingJny.version + 1),
        conflictError: null,
      };

      const updatedJourneys = {
        ...state.journeys,
        [vehicleId]: updatedJny,
      };

      saveUserPortalToStorage(updatedJourneys, state.activeVehicleId, state.completedSessions, state.executionMode);

      if (vehicleId === state.activeVehicleId) {
        useUserPortalStore.setState({
          journeys: updatedJourneys,
          journeyStep: updatedJny.journeyStep,
          assignedSpaceId: updatedJny.assignedSpaceId,
          assignedSpace: updatedJny.assignedSpace,
          activeSession: updatedJny.activeSession,
          sessionDurationSeconds: updatedJny.sessionDurationSeconds,
          sessionTimerRunning: updatedJny.sessionTimerRunning,
          vehiclePosition: updatedJny.vehiclePosition,
          vehicleHeading: updatedJny.vehicleHeading,
          conflictError: null,
        });
      } else {
        useUserPortalStore.setState({ journeys: updatedJourneys });
      }
    } else if (msg.type === "SYNC_EVIDENCE_STEP") {
      const { mappedVehicleId, stepIndex, events } = msg.payload;
      if (mappedVehicleId && DEMO_VEHICLE_IDS.includes(mappedVehicleId as DemoVehicleId)) {
        useUserPortalStore.getState().selectVehicle(mappedVehicleId as DemoVehicleId);
      }
      useUserPortalStore.setState((state) => ({
        evidenceStepIndex: stepIndex,
        events: [...events, ...state.events].slice(0, 50),
      }));
    }
  });
}


