"use client";

import { create } from "zustand";
import {
  CANONICAL_16_CAMERAS,
  CANONICAL_60_SPACES,
  DEMO_30_VEHICLES,
  ACCESS_POINT_B2,
  type DemoCamera,
  type DemoParkingSpace,
  type DemoVehicleConfig,
} from "@/components/digital-twin/demoScenarioData";
import { crossTabSyncService } from "@/services/sync/crossTabSyncService";
import { DEMO_VEHICLES } from "@/config/demoVehicles";

export type MovieStatus = "READY" | "RUNNING" | "PAUSED" | "COMPLETED" | "RESET";
export type VehicleMovieState = "UPCOMING" | "ENTERING" | "PARKED" | "STAYING" | "EXITING" | "EXITED";

export interface DemoMovieEvent {
  id: string;
  timeSeconds: number;
  timeLabel: string;
  eventType: "VEHICLE_ENTRY" | "VEHICLE_PARKED" | "VEHICLE_EXITING" | "VEHICLE_EXITED";
  vehicleId: string;
  plate: string;
  slotId: string;
  message: string;
  camera: string;
}

export interface RuntimeVehicleState {
  id: string;
  plate: string;
  isTypeA: boolean;
  assignedSlot: string;
  color: string;
  model: string;
  state: VehicleMovieState;
  currentPosition: [number, number] | null;
  currentHeading: number;
  entryTime: number;
  parkTime: number;
  exitStartTime: number;
  exitCompleteTime: number;
  activeRoute: [number, number][];
}

export interface RuntimeSpaceState extends DemoParkingSpace {
  isOccupied: boolean;
  currentVehicleId: string | null;
  currentPlate: string | null;
}

interface DemoMovieStoreState {
  status: MovieStatus;
  currentTime: number; // in seconds
  totalDuration: number;
  speed: number; // 0.5, 1, 2, 4
  vehicles: RuntimeVehicleState[];
  spaces: RuntimeSpaceState[];
  cameras: DemoCamera[];
  events: DemoMovieEvent[];
  selectedVehicleId: string | null;
  selectedSlotId: string | null;
  selectedCameraId: string | null;
  layerVisibility: {
    parking: boolean;
    vehicles: boolean;
    cameras: boolean;
    routes: boolean;
    zones: boolean;
    coverage?: boolean;
    infrastructure?: boolean;
  };

  // Actions
  startMovie: () => void;
  pauseMovie: () => void;
  resumeMovie: () => void;
  resetMovie: (options?: { broadcast?: boolean } | unknown) => void;
  setSpeed: (speed: number) => void;
  selectVehicle: (id: string | null) => void;
  selectSlot: (id: string | null) => void;
  selectCamera: (id: string | null) => void;
  toggleLayer: (
    layer: "parking" | "vehicles" | "cameras" | "routes" | "zones" | "coverage" | "infrastructure"
  ) => void;
  tick: (deltaSeconds: number) => void;
  applyVehicleOccupancy: (
    spaceId: string,
    isOccupied: boolean,
    vehicleId?: string | null,
    plate?: string | null
  ) => void;
  applyVehicleJourney: (payload: {
    vehicleId: string;
    journeyStep: string;
    assignedSpaceId?: string | null;
    vehiclePosition?: [number, number] | null;
    vehicleHeading?: number;
    plate?: string | null;
  }) => void;
  hydrateFromStorage: () => void;
}

// ─── POLYLINE INTERPOLATION HELPER ───────────────────────────────────────────
function interpolatePolyline(
  points: [number, number][],
  progress: number
): { position: [number, number]; heading: number } {
  if (!points || points.length === 0) {
    return { position: [0, 0], heading: 0 };
  }
  const first = points[0] ?? [0, 0];
  if (points.length === 1 || progress <= 0) {
    return { position: first, heading: 0 };
  }
  const last = points[points.length - 1] ?? first;
  if (progress >= 1) {
    const prev = points[points.length - 2] ?? first;
    const angle = (Math.atan2(last[1] - prev[1], last[0] - prev[0]) * 180) / Math.PI;
    return { position: last, heading: angle };
  }

  // Calculate segment lengths
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const pCurrent = points[i] ?? [0, 0];
    const pNext = points[i + 1] ?? pCurrent;
    const dx = pNext[0] - pCurrent[0];
    const dy = pNext[1] - pCurrent[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) {
    return { position: first, heading: 0 };
  }

  const targetDist = totalLength * progress;
  let accumulatedDist = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i] ?? 0;
    if (accumulatedDist + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segProgress = segLen > 0 ? (targetDist - accumulatedDist) / segLen : 0;
      const p0 = points[i] ?? first;
      const p1 = points[i + 1] ?? last;
      const x = p0[0] + (p1[0] - p0[0]) * segProgress;
      const y = p0[1] + (p1[1] - p0[1]) * segProgress;
      const heading = (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI;
      return { position: [Math.round(x * 10) / 10, Math.round(y * 10) / 10], heading };
    }
    accumulatedDist += segLen;
  }

  return { position: last, heading: 0 };
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── INITIAL STATE BUILDERS ──────────────────────────────────────────────────
function buildInitialSpaces(): RuntimeSpaceState[] {
  // At t=0, Type B vehicles are parked in their spaces; all others are available
  const typeBVehicles = DEMO_30_VEHICLES.filter((v) => !v.isTypeA);
  const occupiedSlotMap = new Map<string, DemoVehicleConfig>();
  typeBVehicles.forEach((v) => {
    const slot = v.id === "VEH-013" ? "SP-21" : v.assignedSlot;
    occupiedSlotMap.set(slot, { ...v, assignedSlot: slot });
  });

  return CANONICAL_60_SPACES.map((space) => {
    const occupant = occupiedSlotMap.get(space.id);
    return {
      ...space,
      isOccupied: !!occupant,
      currentVehicleId: occupant ? occupant.id : null,
      currentPlate: occupant ? occupant.plate : null,
    };
  });
}

function buildInitialVehicles(): RuntimeVehicleState[] {
  return DEMO_30_VEHICLES.map((v) => {
    const effectiveSlot = v.id === "VEH-013" ? "SP-21" : v.assignedSlot;
    const space = CANONICAL_60_SPACES.find((s) => s.id === effectiveSlot);
    const spaceCenter: [number, number] = space ? [space.x, space.y] : [0, 0];

    if (!v.isTypeA) {
      // Type B: parked from start
      return {
        id: v.id,
        plate: v.plate,
        isTypeA: false,
        assignedSlot: effectiveSlot,
        color: v.color,
        model: v.model,
        state: "PARKED",
        currentPosition: spaceCenter,
        currentHeading: space?.orientation === "horizontal" ? 0 : 90,
        entryTime: 0,
        parkTime: 0,
        exitStartTime: 999999,
        exitCompleteTime: 999999,
        activeRoute: [],
      };
    }

    // Type A: starts upcoming
    return {
      id: v.id,
      plate: v.plate,
      isTypeA: true,
      assignedSlot: v.assignedSlot,
      color: v.color,
      model: v.model,
      state: "UPCOMING",
      currentPosition: null,
      currentHeading: 90,
      entryTime: v.entryTime,
      parkTime: v.parkTime,
      exitStartTime: v.exitStartTime,
      exitCompleteTime: v.exitCompleteTime,
      activeRoute: v.entryRoute,
    };
  });
}

// ─── ZUSTAND STORE ───────────────────────────────────────────────────────────
let tickerIntervalId: ReturnType<typeof setInterval> | null = null;

export const useDemoMovieStore = create<DemoMovieStoreState>((set, get) => ({
  status: "READY",
  currentTime: 0,
  totalDuration: 180, // 3-minute comprehensive presentation cycle
  speed: 1,
  vehicles: buildInitialVehicles(),
  spaces: buildInitialSpaces(),
  cameras: CANONICAL_16_CAMERAS,
  events: [],
  selectedVehicleId: null,
  selectedSlotId: null,
  selectedCameraId: null,
  layerVisibility: {
    parking: true,
    vehicles: true,
    cameras: false,
    routes: false,
    zones: false,
    coverage: false,
    infrastructure: false,
  },

  startMovie: () => {
    if (tickerIntervalId) clearInterval(tickerIntervalId);
    set({ status: "RUNNING" });

    // Tick at 20fps (50ms interval) for smooth vehicle motion
    const TICK_INTERVAL_MS = 50;
    tickerIntervalId = setInterval(() => {
      const { status, speed, tick } = get();
      if (status === "RUNNING") {
        tick((TICK_INTERVAL_MS / 1000) * speed);
      }
    }, TICK_INTERVAL_MS);
  },

  pauseMovie: () => {
    if (tickerIntervalId) {
      clearInterval(tickerIntervalId);
      tickerIntervalId = null;
    }
    set({ status: "PAUSED" });
  },

  resumeMovie: () => {
    get().startMovie();
  },

  resetMovie: (options?: { broadcast?: boolean } | unknown) => {
    const broadcast =
      typeof options === "object" && options !== null && "broadcast" in options
        ? (options as { broadcast?: boolean }).broadcast ?? true
        : true;
    if (tickerIntervalId) {
      clearInterval(tickerIntervalId);
      tickerIntervalId = null;
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("parktwin_user_portal_state_v1");
        localStorage.removeItem("parktwin_sync_event");
      } catch {}
    }
    set({
      status: "READY",
      currentTime: 0,
      vehicles: buildInitialVehicles(),
      spaces: buildInitialSpaces(),
      events: [],
      selectedVehicleId: null,
      selectedSlotId: null,
      selectedCameraId: null,
    });
    if (broadcast) {
      crossTabSyncService.broadcastReset("ADMIN", "DEMO");
    }
  },

  setSpeed: (speed) => set({ speed }),

  selectVehicle: (id) => {
    const { vehicles } = get();
    const veh = vehicles.find((v) => v.id === id);
    set({
      selectedVehicleId: id,
      selectedSlotId: veh ? veh.assignedSlot : null,
    });
  },

  selectSlot: (id) => {
    const { spaces } = get();
    const space = spaces.find((s) => s.id === id);
    set({
      selectedSlotId: id,
      selectedVehicleId: space ? space.currentVehicleId : null,
    });
  },

  selectCamera: (id) => set({ selectedCameraId: id }),

  toggleLayer: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
    })),

  tick: (deltaSeconds) => {
    const state = get();
    const nextTime = +(state.currentTime + deltaSeconds).toFixed(2);

    if (nextTime >= state.totalDuration) {
      if (tickerIntervalId) clearInterval(tickerIntervalId);
      tickerIntervalId = null;
      set({ status: "COMPLETED", currentTime: state.totalDuration });
      return;
    }

    const newEvents = [...state.events];
    const updatedSpaces = [...state.spaces];

    const updatedVehicles = state.vehicles.map((veh) => {
      if (!veh.isTypeA) {
        // Type B is always parked in its space
        return veh;
      }

      const origConfig = DEMO_30_VEHICLES.find((v) => v.id === veh.id);
      if (!origConfig) return veh;

      const space = updatedSpaces.find((s) => s.id === veh.assignedSlot);
      const spaceCenter: [number, number] = space ? [space.x, space.y] : [0, 0];

      // 1. UPCOMING: not yet arrived at Access Point B2
      if (nextTime < veh.entryTime) {
        return {
          ...veh,
          state: "UPCOMING" as const,
          currentPosition: null,
          activeRoute: origConfig.entryRoute,
        };
      }

      // 2. ENTERING: driving from Access Point B2 along aisles to assigned bay
      if (nextTime >= veh.entryTime && nextTime < veh.parkTime) {
        const driveDuration = veh.parkTime - veh.entryTime;
        const progress = Math.min(1, Math.max(0, (nextTime - veh.entryTime) / driveDuration));
        const { position, heading } = interpolatePolyline(origConfig.entryRoute, progress);

        // Emit entry event if transitioning
        if (veh.state === "UPCOMING") {
          newEvents.unshift({
            id: `evt_entry_${veh.id}_${nextTime}`,
            timeSeconds: nextTime,
            timeLabel: formatTime(nextTime),
            eventType: "VEHICLE_ENTRY",
            vehicleId: veh.id,
            plate: veh.plate,
            slotId: veh.assignedSlot,
            message: `${veh.plate} entered via CAM-01 at B2 Gateway, routing to ${veh.assignedSlot}.`,
            camera: "CAM-01",
          });
        }

        return {
          ...veh,
          state: "ENTERING" as const,
          currentPosition: position,
          currentHeading: heading,
          activeRoute: origConfig.entryRoute,
        };
      }

      // 3. PARKED / STAYING: stationary in assigned space
      if (nextTime >= veh.parkTime && nextTime < veh.exitStartTime) {
        // Space flips to OCCUPIED!
        const spaceIdx = updatedSpaces.findIndex((s) => s.id === veh.assignedSlot);
        const currSpace = spaceIdx >= 0 ? updatedSpaces[spaceIdx] : undefined;
        if (currSpace && !currSpace.isOccupied) {
          updatedSpaces[spaceIdx] = {
            ...currSpace,
            isOccupied: true,
            currentVehicleId: veh.id,
            currentPlate: veh.plate,
          };
        }

        // Emit parked event if transitioning
        if (veh.state === "ENTERING") {
          newEvents.unshift({
            id: `evt_park_${veh.id}_${nextTime}`,
            timeSeconds: nextTime,
            timeLabel: formatTime(nextTime),
            eventType: "VEHICLE_PARKED",
            vehicleId: veh.id,
            plate: veh.plate,
            slotId: veh.assignedSlot,
            message: `${veh.plate} successfully parked in ${veh.assignedSlot}. Session active.`,
            camera: space?.coveringCamera || "CAM-02",
          });
        }

        return {
          ...veh,
          state: "PARKED" as const,
          currentPosition: spaceCenter,
          currentHeading: space?.orientation === "horizontal" ? 0 : 90,
          activeRoute: origConfig.entryRoute,
        };
      }

      // 4. EXITING: driving from bay to Access Point B2
      if (nextTime >= veh.exitStartTime && nextTime < veh.exitCompleteTime) {
        // Space flips back to AVAILABLE!
        const spaceIdx = updatedSpaces.findIndex((s) => s.id === veh.assignedSlot);
        const currSpace = spaceIdx >= 0 ? updatedSpaces[spaceIdx] : undefined;
        if (currSpace && currSpace.isOccupied) {
          updatedSpaces[spaceIdx] = {
            ...currSpace,
            isOccupied: false,
            currentVehicleId: null,
            currentPlate: null,
          };
        }

        const exitDuration = veh.exitCompleteTime - veh.exitStartTime;
        const progress = Math.min(1, Math.max(0, (nextTime - veh.exitStartTime) / exitDuration));
        const { position, heading } = interpolatePolyline(origConfig.exitRoute, progress);

        // Emit exiting event if transitioning
        if (veh.state === "PARKED") {
          newEvents.unshift({
            id: `evt_exiting_${veh.id}_${nextTime}`,
            timeSeconds: nextTime,
            timeLabel: formatTime(nextTime),
            eventType: "VEHICLE_EXITING",
            vehicleId: veh.id,
            plate: veh.plate,
            slotId: veh.assignedSlot,
            message: `${veh.plate} unparked from ${veh.assignedSlot}, departing towards B2 Gateway.`,
            camera: space?.coveringCamera || "CAM-03",
          });
        }

        return {
          ...veh,
          state: "EXITING" as const,
          currentPosition: position,
          currentHeading: heading,
          activeRoute: origConfig.exitRoute,
        };
      }

      // 5. EXITED: vehicle reached Access Point B2 and disappeared
      if (nextTime >= veh.exitCompleteTime) {
        // Space confirmed AVAILABLE
        const spaceIdx = updatedSpaces.findIndex((s) => s.id === veh.assignedSlot);
        const currSpace = spaceIdx >= 0 ? updatedSpaces[spaceIdx] : undefined;
        if (currSpace && currSpace.isOccupied) {
          updatedSpaces[spaceIdx] = {
            ...currSpace,
            isOccupied: false,
            currentVehicleId: null,
            currentPlate: null,
          };
        }

        // Emit exited event if transitioning
        if (veh.state === "EXITING") {
          newEvents.unshift({
            id: `evt_exited_${veh.id}_${nextTime}`,
            timeSeconds: nextTime,
            timeLabel: formatTime(nextTime),
            eventType: "VEHICLE_EXITED",
            vehicleId: veh.id,
            plate: veh.plate,
            slotId: veh.assignedSlot,
            message: `${veh.plate} cleared exit gate at CAM-16. Dwell session closed.`,
            camera: "CAM-16",
          });
        }

        return {
          ...veh,
          state: "EXITED" as const,
          currentPosition: null,
          activeRoute: [],
        };
      }

      return veh;
    });

    set({
      currentTime: nextTime,
      vehicles: updatedVehicles,
      spaces: updatedSpaces,
      events: newEvents.slice(0, 50), // Keep latest 50 events
    });
  },

  applyVehicleOccupancy: (spaceId, isOccupied, vehicleId, plate) => {
    const { spaces, vehicles, events, currentTime } = get();
    const spaceObj = spaces.find((s) => s.id === spaceId);

    // 1. Update spaces
    const updatedSpaces = spaces.map((s) =>
      s.id === spaceId
        ? {
            ...s,
            isOccupied,
            currentVehicleId: isOccupied ? (vehicleId ?? s.currentVehicleId) : null,
            currentPlate: isOccupied ? (plate ?? s.currentPlate) : null,
          }
        : s
    );

    // 2. Update vehicles
    let updatedVehicles = [...vehicles];
    if (isOccupied && vehicleId) {
      const spaceCenter: [number, number] = spaceObj ? [spaceObj.x, spaceObj.y] : [0, 0];
      const heading = spaceObj?.orientation === "horizontal" ? 0 : 90;
      const vIndex = updatedVehicles.findIndex((v) => v.id === vehicleId);

      if (vIndex >= 0) {
        updatedVehicles[vIndex] = {
          ...updatedVehicles[vIndex]!,
          state: "PARKED",
          assignedSlot: spaceId,
          currentPosition: spaceCenter,
          currentHeading: heading,
          plate: plate || updatedVehicles[vIndex]!.plate,
        };
      } else {
        updatedVehicles.push({
          id: vehicleId,
          plate: plate || vehicleId,
          isTypeA: true,
          assignedSlot: spaceId,
          color: "#3b82f6",
          model: "Vehicle",
          state: "PARKED",
          currentPosition: spaceCenter,
          currentHeading: heading,
          entryTime: 0,
          parkTime: 0,
          exitStartTime: 999999,
          exitCompleteTime: 999999,
          activeRoute: [],
        });
      }
    } else if (!isOccupied) {
      // Find vehicle assigned to this slot or matching vehicleId
      updatedVehicles = updatedVehicles.map((v) => {
        if ((vehicleId && v.id === vehicleId) || (!vehicleId && v.assignedSlot === spaceId)) {
          return {
            ...v,
            state: "EXITED",
            currentPosition: null,
          };
        }
        return v;
      });
    }

    // 3. Log event
    const eventType = isOccupied ? "VEHICLE_PARKED" : "VEHICLE_EXITED";
    const message = isOccupied
      ? `${plate || vehicleId || "Vehicle"} successfully parked in ${spaceId}. Session active.`
      : `${plate || vehicleId || "Vehicle"} unparked from ${spaceId}, departing towards B2 Gateway.`;

    const newEvt: DemoMovieEvent = {
      id: `evt_sync_${spaceId}_${Date.now()}`,
      timeSeconds: Math.floor(currentTime),
      timeLabel: "Live",
      eventType,
      vehicleId: vehicleId ?? "EXTERNAL",
      plate: plate ?? "UNKNOWN",
      slotId: spaceId,
      message,
      camera: spaceObj?.coveringCamera || (isOccupied ? "CAM-02" : "CAM-03"),
    };

    set({
      spaces: updatedSpaces,
      vehicles: updatedVehicles,
      events: [newEvt, ...events].slice(0, 50),
    });
  },

  applyVehicleJourney: (payload) => {
    const { spaces, vehicles } = get();
    const { vehicleId, journeyStep, assignedSpaceId, vehiclePosition, vehicleHeading, plate } = payload;
    let updatedVehicles = [...vehicles];
    let updatedSpaces = [...spaces];

    if (journeyStep === "PARKED") {
      if (assignedSpaceId) {
        get().applyVehicleOccupancy(assignedSpaceId, true, vehicleId, plate);
        return;
      }
    } else if (journeyStep === "NAVIGATING_TO_EXIT" || journeyStep === "AT_GATEWAY") {
      const vIndex = updatedVehicles.findIndex((v) => v.id === vehicleId);
      const pos: [number, number] = vehiclePosition ?? [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y];
      if (vIndex >= 0) {
        updatedVehicles[vIndex] = {
          ...updatedVehicles[vIndex]!,
          state: "EXITING",
          currentPosition: pos,
          currentHeading: vehicleHeading ?? updatedVehicles[vIndex]!.currentHeading,
        };
        set({ vehicles: updatedVehicles });
      }
    } else if (journeyStep === "SESSION_COMPLETE" || journeyStep === "EXIT_CONFIRMED") {
      const vIndex = updatedVehicles.findIndex((v) => v.id === vehicleId);
      if (vIndex >= 0) {
        updatedVehicles[vIndex] = {
          ...updatedVehicles[vIndex]!,
          state: "EXITED",
          currentPosition: null,
        };
      }
      updatedSpaces = updatedSpaces.map((s) =>
        s.currentVehicleId === vehicleId || (assignedSpaceId && s.id === assignedSpaceId)
          ? { ...s, isOccupied: false, currentVehicleId: null, currentPlate: null }
          : s
      );
      set({ vehicles: updatedVehicles, spaces: updatedSpaces });
    }
  },

  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("parktwin_user_portal_state_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.journeys) return;

      const currentSpaces = get().spaces;
      let updatedSpaces = [...currentSpaces];
      let updatedVehicles = [...get().vehicles];

      for (const [vId, jny] of Object.entries(parsed.journeys) as [string, any][]) {
        if (jny && (jny.journeyStep === "PARKED" || jny.journeyStep === "PARKING_SESSION")) {
          const slotId = jny.assignedSpaceId;
          const spaceObj = updatedSpaces.find((s) => s.id === slotId);
          if (spaceObj) {
            const vehiclePlate = DEMO_VEHICLES[vId]?.evidence.plate || jny.activeSession?.plate || vId;
            updatedSpaces = updatedSpaces.map((s) =>
              s.id === slotId
                ? {
                    ...s,
                    isOccupied: true,
                    currentVehicleId: vId,
                    currentPlate: vehiclePlate,
                  }
                : s
            );
            const vIndex = updatedVehicles.findIndex((v) => v.id === vId);
            const pos: [number, number] = [spaceObj.x, spaceObj.y];
            const heading = spaceObj.orientation === "horizontal" ? 0 : 90;
            if (vIndex >= 0) {
              updatedVehicles[vIndex] = {
                ...updatedVehicles[vIndex]!,
                state: "PARKED",
                assignedSlot: slotId,
                currentPosition: pos,
                currentHeading: heading,
                plate: vehiclePlate,
              };
            } else {
              updatedVehicles.push({
                id: vId,
                plate: vehiclePlate,
                isTypeA: true,
                assignedSlot: slotId,
                color: DEMO_VEHICLES[vId]?.scenario.color || "#3b82f6",
                model: DEMO_VEHICLES[vId]?.scenario.model || "Vehicle",
                state: "PARKED",
                currentPosition: pos,
                currentHeading: heading,
                entryTime: 0,
                parkTime: 0,
                exitStartTime: 999999,
                exitCompleteTime: 999999,
                activeRoute: [],
              });
            }
          }
        }
      }

      set({ spaces: updatedSpaces, vehicles: updatedVehicles });
    } catch (err) {
      console.warn("[DemoMovieStore] Storage hydration error:", err);
    }
  },
}));

// Cross-tab synchronization listener for Admin Digital Twin
if (typeof window !== "undefined") {
  (window as any).__parktwin_movie_store = useDemoMovieStore;
  setTimeout(() => {
    useDemoMovieStore.getState().hydrateFromStorage();
  }, 0);

  crossTabSyncService.subscribe((msg) => {
    if (msg.type === "SYNC_OCCUPANCY") {
      const { spaceId, isOccupied, vehicleId, plate } = msg.payload;
      useDemoMovieStore.getState().applyVehicleOccupancy(spaceId, isOccupied, vehicleId, plate);
    } else if (msg.type === "SYNC_VEHICLE_JOURNEY") {
      useDemoMovieStore.getState().applyVehicleJourney(msg.payload);
    } else if (msg.type === "SYNC_RESET") {
      if (msg.payload.source === "USER") {
        useDemoMovieStore.getState().resetMovie({ broadcast: false });
      }
    } else if (msg.type === "SYNC_EVIDENCE_STEP") {
      const { mappedVehicleId, plateNumber, frameId, trackId } = msg.payload;
      const existingEvents = useDemoMovieStore.getState().events;
      const demoEvt: DemoMovieEvent = {
        id: `evt_cctv_${frameId}_${trackId}_${Date.now()}`,
        timeSeconds: frameId,
        timeLabel: `${Math.floor(frameId / 30)}s`,
        eventType: "VEHICLE_ENTRY",
        vehicleId: mappedVehicleId ?? `TRK-${trackId}`,
        plate: plateNumber ?? "PENDING_ANPR",
        slotId: "SP-08",
        message: `Real CCTV Entry: Track #${trackId} at B2 Entrance Gate (${plateNumber ?? "Pending ANPR"})`,
        camera: "CAM-01",
      };
      useDemoMovieStore.setState({ events: [demoEvt, ...existingEvents].slice(0, 50) });
    }
  });
}

