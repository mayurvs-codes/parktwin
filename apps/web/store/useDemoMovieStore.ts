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
  };

  // Actions
  startMovie: () => void;
  pauseMovie: () => void;
  resumeMovie: () => void;
  resetMovie: () => void;
  setSpeed: (speed: number) => void;
  selectVehicle: (id: string | null) => void;
  selectSlot: (id: string | null) => void;
  selectCamera: (id: string | null) => void;
  toggleLayer: (layer: "parking" | "vehicles" | "cameras" | "routes" | "zones") => void;
  tick: (deltaSeconds: number) => void;
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
  typeBVehicles.forEach((v) => occupiedSlotMap.set(v.assignedSlot, v));

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
    const space = CANONICAL_60_SPACES.find((s) => s.id === v.assignedSlot);
    const spaceCenter: [number, number] = space ? [space.x, space.y] : [0, 0];

    if (!v.isTypeA) {
      // Type B: parked from start
      return {
        id: v.id,
        plate: v.plate,
        isTypeA: false,
        assignedSlot: v.assignedSlot,
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
    cameras: true,
    routes: true,
    zones: true,
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

  resetMovie: () => {
    if (tickerIntervalId) {
      clearInterval(tickerIntervalId);
      tickerIntervalId = null;
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
}));
